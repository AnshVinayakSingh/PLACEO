"""
VaxGard AI — Model Fine-Tuning Script
Engineered for Ansh Vinayak Singh
Powered by Unsloth + Qwen 2.5 Coder / Llama 3.1 8B

This script trains your own custom model weights on your dataset!
"""

import os

def print_training_banner():
    print("=" * 60)
    print("🛡️  VaxGard AI Model Fine-Tuning Engine")
    print("   Slogan: Build. Scan. Secure.")
    print("   Creator & Developer: Ansh Vinayak Singh")
    print("=" * 60)

train_script_content = """
# Install unsloth & trl
# !pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
# !pip install --no-deps "xformers<0.0.27" "trl<0.9.0" peft accelerate bitsandbytes

import torch
from unsloth import FastLanguageModel
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

max_seq_length = 2048
dtype = None # Auto detect
load_in_4bit = True # 4bit quantization for fast GPU training

print("📥 Loading Base Model (Qwen 2.5 Coder 7B)...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen2.5-Coder-7B-Instruct",
    max_seq_length = max_seq_length,
    dtype = dtype,
    load_in_4bit = load_in_4bit,
)

print("⚙️ Applying LoRA Adapters for VaxGard AI...")
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)

print("📂 Loading VaxGard Training Dataset...")
dataset = load_dataset("json", data_files="vaxgard_training_data.jsonl", split="train")

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "messages",
    max_seq_length = max_seq_length,
    dataset_num_proc = 2,
    packing = False,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60,
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

print("🚀 Starting VaxGard AI Fine-Tuning Training...")
trainer_stats = trainer.train()

print("💾 Saving Trained VaxGard Model Weights...")
model.save_pretrained("vaxgard_model_lora")
tokenizer.save_pretrained("vaxgard_model_lora")

print("🎉 Training Complete! Your custom VaxGard AI model weights are ready.")
"""

if __name__ == "__main__":
    print_training_banner()
    with open("train_vaxgard.py", "w", encoding="utf-8") as f:
        f.write(train_script_content)
    print("✅ Created train_vaxgard.py for Unsloth / PyTorch fine-tuning!")
