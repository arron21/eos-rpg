import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

const DEFAULT_MODEL_ID = "HuggingFaceTB/SmolLM2-360M-Instruct";

let webgpuSupported = false;
let fp16Supported = false;

let activeModelId = null;
let activeDtype = null;
let textGenerator = null;

const stoppingCriteria = new InterruptableStoppingCriteria();

/**
 * Detect WebGPU and shader-f16 support in the browser
 */
async function checkWebGPU() {
  try {
    if (!("gpu" in navigator)) {
      webgpuSupported = false;
      fp16Supported = false;
      self.postMessage({
        status: "webgpu_status",
        supported: false,
        fp16: false,
        message: "WASM CPU Mode (WebGPU unavailable)",
      });
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      webgpuSupported = false;
      fp16Supported = false;
      self.postMessage({
        status: "webgpu_status",
        supported: false,
        fp16: false,
        message: "WASM CPU Mode (No GPU Adapter)",
      });
      return;
    }

    webgpuSupported = true;
    fp16Supported = adapter.features.has("shader-f16");
    self.postMessage({
      status: "webgpu_status",
      supported: true,
      fp16: fp16Supported,
      message: `WebGPU Active (${fp16Supported ? "FP16" : "FP32"})`,
    });
  } catch (err) {
    webgpuSupported = false;
    fp16Supported = false;
    self.postMessage({
      status: "webgpu_status",
      supported: false,
      fp16: false,
      message: `WebGPU fallback: ${err.message}`,
    });
  }
}

function handleModelProgress(progressEvent) {
  self.postMessage({
    status: "model_progress",
    ...progressEvent,
  });
}

function resolveDtype(requestedDtype) {
  if (requestedDtype && requestedDtype !== "auto") {
    return requestedDtype;
  }
  return webgpuSupported ? (fp16Supported ? "q4f16" : "q4") : "q4";
}

async function loadModel({ modelId = DEFAULT_MODEL_ID, dtype = "auto" }) {
  try {
    const resolvedDtype = resolveDtype(dtype);

    self.postMessage({
      status: "loading_start",
      modelId,
      dtype: resolvedDtype,
    });

    if (
      !textGenerator ||
      activeModelId !== modelId ||
      activeDtype !== resolvedDtype
    ) {
      if (textGenerator && typeof textGenerator.dispose === "function") {
        try {
          await textGenerator.dispose();
        } catch (_e) {
          // ignore dispose error
        }
      }
      textGenerator = null;

      const device = webgpuSupported ? "webgpu" : "wasm";
      try {
        textGenerator = await pipeline("text-generation", modelId, {
          device,
          dtype: resolvedDtype,
          progress_callback: handleModelProgress,
        });
      } catch (primaryErr) {
        if (resolvedDtype === "q4f16") {
          textGenerator = await pipeline("text-generation", modelId, {
            device,
            dtype: "q4",
            progress_callback: handleModelProgress,
          });
        } else {
          throw primaryErr;
        }
      }

      activeModelId = modelId;
      activeDtype = resolvedDtype;
    }

    self.postMessage({
      status: "model_ready",
      modelId: activeModelId,
      dtype: activeDtype,
    });
    return true;
  } catch (err) {
    self.postMessage({
      status: "error",
      message: err?.message || String(err),
    });
    return false;
  }
}

async function generateTurn({
  messages,
  modelId = DEFAULT_MODEL_ID,
  dtype = "auto",
  config = {},
  jobId = null,
}) {
  try {
    const resolvedDtype = resolveDtype(dtype);
    if (
      !textGenerator ||
      activeModelId !== modelId ||
      activeDtype !== resolvedDtype
    ) {
      const loaded = await loadModel({ modelId, dtype });
      if (!loaded) return;
    }

    stoppingCriteria.reset();
    const requestStart = performance.now();

    self.postMessage({
      status: "generation_start",
      modelId: activeModelId,
      jobId,
    });

    let numTokens = 0;
    let firstTokenTime = null;
    let fullText = "";
    let ttftMs = null;

    const streamer = new TextStreamer(textGenerator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (tokenText) => {
        const now = performance.now();
        if (firstTokenTime === null) {
          firstTokenTime = now;
          ttftMs = Math.round(now - requestStart);
        }
        numTokens += 1;
        fullText += tokenText;
        const elapsedSec = (now - firstTokenTime) / 1000;
        const tps =
          elapsedSec > 0.02
            ? (numTokens / elapsedSec).toFixed(1)
            : (numTokens / ((now - requestStart) / 1000)).toFixed(1);

        self.postMessage({
          status: "token",
          jobId,
          token: tokenText,
          fullText,
          tps,
          numTokens,
          ttftMs,
        });
      },
    });

    const maxNewTokens = Number(config.maxNewTokens) || 320;
    const temperature =
      config.temperature !== undefined ? Number(config.temperature) : 0.7;
    const topP = config.topP !== undefined ? Number(config.topP) : 0.9;

    const output = await textGenerator(messages, {
      max_new_tokens: maxNewTokens,
      temperature,
      top_p: topP,
      do_sample: temperature > 0.01,
      repetition_penalty: 1.12,
      streamer,
      stopping_criteria: stoppingCriteria,
    });

    if (!fullText && Array.isArray(output) && output.length > 0) {
      const generated = output[0]?.generated_text;
      if (Array.isArray(generated)) {
        const lastMsg = generated[generated.length - 1];
        fullText = lastMsg?.content || "";
      } else if (typeof generated === "string") {
        fullText = generated;
      }
    }

    const totalMs = Math.round(performance.now() - requestStart);

    self.postMessage({
      status: "complete",
      jobId,
      fullText,
      numTokens,
      ttftMs: ttftMs ?? totalMs,
      totalMs,
    });
  } catch (err) {
    self.postMessage({
      status: "error",
      jobId,
      message: err?.message || String(err),
    });
  }
}

self.addEventListener("message", async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case "check_webgpu":
      await checkWebGPU();
      break;
    case "load_model":
      await loadModel(payload || {});
      break;
    case "generate_turn":
      await generateTurn(payload || {});
      break;
    case "interrupt":
      stoppingCriteria.interrupt();
      break;
    default:
      break;
  }
});
