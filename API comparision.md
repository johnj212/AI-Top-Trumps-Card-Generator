# Image Generation API Pricing Comparison (2024)

| Service | Model/Plan | Price per Image | Resolution Options | API Access | Key Features | Cost Factors |
|---------|------------|-----------------|-------------------|------------|--------------|--------------|
| **Google Imagen** | Imagen 4 Fast | $0.02 | Up to 2K | ✅ Gemini API | Fastest generation, SynthID watermark | Volume, resolution |
| | Imagen 4 | $0.04 | Up to 2K | ✅ Gemini API | Flagship model, high quality | Volume, resolution |
| | Imagen 4 Ultra | $0.06 | Up to 2K | ✅ Gemini API | Highest quality, precise prompts | Volume, resolution |
| | Imagen 3 | $0.03 | Various aspects | ✅ Gemini API | Previous generation | Volume, aspect ratio |
| **OpenAI DALL-E 3** | Standard | $0.04 (1024×1024)<br/>$0.08 (1024×1792) | 1024×1024<br/>1024×1792 | ✅ Official API | High quality, safety filters | Resolution, quality level |
| | HD Quality | $0.08 (1024×1024)<br/>$0.12 (1024×1792) | 1024×1024<br/>1024×1792 | ✅ Official API | Enhanced detail | Resolution, HD processing |
| **Midjourney** | Basic Plan | $10/month + API fee | Various | ❌ No official API | Artistic style, community | Subscription + 3rd party API |
| | Standard Plan | $30/month + API fee | Various | ❌ No official API | More generations | Subscription + 3rd party API |
| | Pro Plan | $60/month + API fee | Various | ❌ No official API | Privacy, unlimited relax | Subscription + 3rd party API |
| **Stable Diffusion** | RunPod | $0.34/hr (RTX 4090)<br/>$1.99/hr (H100) | Custom | ✅ Self-hosted | Full control, open source | GPU time, instance type |
| | Replicate | Pay-per-use | Various | ✅ Hosted API | Easy setup, no infrastructure | Compute time, model size |
| | Hugging Face | $0.032/CPU hr<br/>$0.5/GPU hr | Various | ✅ Inference API | ML platform integration | Compute time, hardware type |
| | Stability AI | $0.05-0.10 | Various | ✅ Official API | Original creators | Model type, resolution |

## Key Cost Influencing Factors

### 1. Resolution & Quality

- Higher resolutions cost more across all platforms
- HD/Premium quality options typically 2x base price
- Aspect ratio variations may affect pricing

### 2. Volume & Usage Patterns

- Most services offer volume discounts
- Pay-per-use vs subscription models
- Free tiers available for testing

### 3. Infrastructure Costs

- **Hosted APIs**: Convenience premium but predictable pricing
- **Self-hosted**: Lower per-image costs but require GPU infrastructure
- **Hybrid**: Third-party APIs for services without official APIs

### 4. Model Complexity

- Newer models (Imagen 4, DALL-E 3) cost more than older versions
- Specialized features (watermarking, safety filters) add value/cost
- Fine-tuning and customization capabilities

### 5. Additional Services

- API rate limits and priority queues
- Storage and bandwidth costs
- Support and enterprise features

## Recommendations by Use Case

- **High Volume/Cost-Sensitive**: Stable Diffusion on RunPod or self-hosted
- **Enterprise/Production**: Google Imagen 4 or OpenAI DALL-E 3 (official APIs)
- **Artistic/Creative**: Midjourney (despite API limitations)
- **Experimentation**: Hugging Face (free tier) or Google AI Studio
- **Balance of Quality/Cost**: Google Imagen 4 Fast or Imagen 3

## Summary

The research shows that **Google Imagen 4 Fast at $0.02 per image** offers excellent value for high-volume use cases, while **OpenAI DALL-E 3** provides reliable enterprise-grade service at $0.04-0.12 per image depending on resolution and quality settings.

Your current AI Top Trumps project now uses **Imagen 4 Fast** at $0.02 per image, providing excellent cost efficiency and faster generation compared to the previous Imagen 3.0 implementation at $0.03 per image.