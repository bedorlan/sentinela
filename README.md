# Sentinela 👁️

> **Watch what matters to you**

AI-powered video monitoring that runs on your laptop, watches what's important to YOU, and keeps your data completely private.

## What is Sentinela?

Sentinela transforms your laptop into a powerful AI monitoring system using real-time object detection. Tell it what to watch for in your own words - from pet safety to elder care to capturing precious moments.

**The Beautiful Truth**: Your laptop is already powerful enough. No cloud required, no monthly fees, complete privacy.

## ✨ Features

- **Natural Language Monitoring**: Describe what to watch for in your own words
- **Smart Alerts**: Email notifications with video attachments when events occur
- **Active Reassurance**: Optional "everything's okay" notifications
- **Joy Capture**: Automatic recording of special moments
- **Multiple AI Backends**: OpenRouter, Google AI Studio or local Gemma models
- **100% Privacy Option**: Runs completely offline with local models
- **Web Interface**: React-based frontend with real-time monitoring
- **Long-Running Sessions**: Designed for continuous operation (days/weeks)
- **Demo Mode**: Test with pre-recorded videos

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/bedorlan/sentinela.git
cd sentinela
pip install -r requirements.txt

# Start monitoring
python main.py
```

Open `http://localhost:8000` and tell Sentinela what matters to you.

## 💡 Usage Examples

```
"my dog Max gets on my bed"
"my Mom took her medications"
"the baby takes first steps"
"Warn me if water appears in the basement"
"Let me know when the 3D print gets stuck"
```

## ⚙️ Configuration

### AI Service Setup

One of the following environment variables is required to run Sentinela:

| Variable             | Description                               | Default |
| -------------------- | ----------------------------------------- | ------- |
| `OPENROUTER_API_KEY` | OpenRouter API key                        | -       |
| `HF_TOKEN`           | Hugging Face token for local Gemma models | -       |
| `HF_HUB_OFFLINE`     | Set to '1' for complete offline operation | -       |

### Email Notifications

To enable email notifications, please set the following variables:

| Variable          | Description          | Default        |
| ----------------- | -------------------- | -------------- |
| `SMTP_HOST`       | SMTP server          | smtp.gmail.com |
| `SMTP_PORT`       | SMTP port            | 587            |
| `SMTP_USERNAME`   | Your email username  | -              |
| `SMTP_PASSWORD`   | Your email password  | -              |
| `SMTP_FROM_EMAIL` | Sender email address | -              |

### Application Settings

Running on an old laptop? Try lowering the `FRAMES_PER_INFERENCE` value.

| Variable                 | Description                               | Default |
| ------------------------ | ----------------------------------------- | ------- |
| `FRAMES_PER_INFERENCE`   | Video frames processed per AI inference   | 6       |
| `SENTINELA_SERVER_MODE`  | Set to '1' for server mode                | -       |
| `DISABLE_AUTHENTICATION` | Set to '1' to disable auth on server mode | -       |
| `GUEST_PASSWORD`         | Password for guest access on server mode  | -       |

## 🏗️ Installation Options

### Local Development

```bash
pip install -r requirements.txt          # Standard installation
pip install -r requirements-cpu.txt      # CPU-only (no GPU)
pip install -r requirements-cuda124.txt  # CUDA 12.4 support
```

### Server Deployment

```bash
export SENTINELA_SERVER_MODE=1
python main.py
```

## 🔒 Privacy & Security

- **Offline Operation**: Use local Gemma models, no internet required
- **Your Data Stays Local**: Video never leaves your device
- **Basic Authentication**: Optional password protection for server mode
- **No Account Required**: Start monitoring immediately

## 📡 API Reference

- `GET /` - Main application interface
- `WebSocket /ws` - Real-time video stream and events
- `POST /email` - Send email notifications
- `POST /watch-log-summary` - Generate detection summaries

## 🛠️ Technology Stack

- **Backend**: FastAPI, Python 3.11+
- **Frontend**: React 18, Tailwind CSS
- **AI/ML**: Hugging Face Transformers, OpenRouter
- **Communication**: WebSockets, MessagePack

## 🌟 Use Cases

- **Pet Care**: Behavior monitoring, emergency alerts, cute moments
- **Elder Care**: Daily wellness checks, fall detection, medication hours
- **Baby Monitoring**: Milestone capture, sleep tracking, safety alerts
- **Home Security**: Leak detection, intrusion alerts, safety monitoring
- **Have a unique use case?** Just tell Sentinela what to watch for in your own words.

_If it matters to you, Sentinela can watch it._

## 💫 The Vision

A world where your laptop becomes a caring companion that watches over what matters most - reducing stress, confirming safety, and capturing joy. All while keeping your data completely private.

---

**What will you watch for?**
