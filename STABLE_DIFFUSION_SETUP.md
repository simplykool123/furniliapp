# Stable Diffusion WebUI Setup Guide

## Overview
Set up AUTOMATIC1111's Stable Diffusion WebUI for unlimited, free AI image generation in your Furnili Management System.

## Quick Setup (Windows)

### 1. Prerequisites
- Python 3.10.6+ (3.11 supported)
- Git
- NVIDIA GPU with CUDA support (recommended)

### 2. Installation
```bash
# Clone repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Enable API mode
echo set COMMANDLINE_ARGS=--api > webui-user.bat

# First run (downloads models automatically)
webui.bat
```

### 3. Configure for Furnili
Add to your Furnili environment variables:
```
STABLE_DIFFUSION_URL=http://127.0.0.1:7860
```

## Quick Setup (Linux/macOS)

### 1. Installation
```bash
# Clone repository
git clone https://github.com/AUTOMATIC1111/stable-diffusion-webui.git
cd stable-diffusion-webui

# Enable API mode
echo 'export COMMANDLINE_ARGS="--api"' > webui-user.sh

# Make executable and run
chmod +x webui.sh
./webui.sh
```

### 2. Configure for Furnili
```bash
# Add to your environment
export STABLE_DIFFUSION_URL=http://127.0.0.1:7860
```

## Cloud/Remote Setup

### For remote access:
```bash
# Enable API and listen on all interfaces
export COMMANDLINE_ARGS="--api --listen --port 7860"
```

### Then configure:
```
STABLE_DIFFUSION_URL=http://your-server-ip:7860
```

## Interior Design Models (Optional)

### Recommended models for better interior design results:
1. **ArchitectureHelper** - Specialized for architectural/interior images
2. **RealisticVision** - High-quality realistic images
3. **DreamShaper** - Versatile for various interior styles

### Download and place in `models/Stable-diffusion/` folder

## Benefits

✅ **Unlimited Generation**: No API costs or billing limits  
✅ **High Quality**: 1024x1024+ resolution support  
✅ **Specialized Models**: Interior design optimized models  
✅ **Local Control**: Full control over generation parameters  
✅ **Privacy**: All processing done locally  

## Verification

1. Start Stable Diffusion WebUI with `--api` flag
2. Visit `http://127.0.0.1:7860/docs` to see API documentation
3. Set `STABLE_DIFFUSION_URL` environment variable
4. Restart Furnili application
5. Create a moodboard - it will use Stable Diffusion automatically!

## Troubleshooting

**Port already in use**: Change port with `--port 7861`  
**CUDA out of memory**: Add `--medvram` or `--lowvram` flags  
**API not working**: Ensure `--api` flag is set in COMMANDLINE_ARGS  

## Status Check
Your Furnili system will automatically detect and use Stable Diffusion WebUI when available, with fallbacks to OpenAI DALL-E, DeepAI, and Craiyon.