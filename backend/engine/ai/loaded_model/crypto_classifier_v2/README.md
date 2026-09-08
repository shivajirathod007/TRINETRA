# crypto_classifier_v2

Drop the fine-tuned model here after running `training/finetune_distilbert.ipynb`:

    config.json
    model.safetensors
    tokenizer.json
    tokenizer_config.json
    special_tokens_map.json  (if produced)
    vocab.txt                (if produced)

These are what `trainer.save_model()` + `tokenizer.save_pretrained()` write.

`settings.ai_model_dir` selects this directory (default `crypto_classifier_v2`).
To roll back to v1, set `AI_MODEL_DIR=crypto_classifier` in `.env`.

Until the weights land here, `AIClassifier.is_loaded` stays False and the
classifier runs its regex pre-pass only — the startup hook logs
`ai_classifier_not_loaded` to make that visible.
