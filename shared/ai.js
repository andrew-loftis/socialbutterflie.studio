import OpenAI from 'openai';

const model = process.env.OPENAI_MODEL || 'gpt-5';
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function noKeyFallback(message) {
  return { error: message || 'OpenAI API key missing' };
}

async function runChat(messages, { temperature = 0.6, maxTokens } = {}) {
  if (!client) return null;
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens
  });
  return completion.choices[0].message.content.trim();
}

export async function generateCaption(brandVoiceData = {}, variantType = 'standard', draft = '') {
  const variantPrompts = {
    short: 'a short (<= 150 characters) caption with a hook and CTA',
    standard: 'a 2-3 sentence caption (<= 400 characters) with a hook, value, and CTA',
    long: 'a long-form caption (<= 1500 characters) with storytelling, pacing, and CTA',
    playful: 'a playful caption (<= 400 characters) with tasteful humor and emojis',
    improve: 'an elevated version of the draft while keeping facts intact'
  };

  const description = variantPrompts[variantType] || variantPrompts.standard;
  
  // Build comprehensive brand voice prompt from 27 fields
  let brandContext = '';
  if (typeof brandVoiceData === 'object' && brandVoiceData !== null) {
    const bv = brandVoiceData;
    brandContext = `
BRAND IDENTITY:
- Business Name: ${bv.businessName || 'Not specified'}
- Industry: ${bv.industry || 'Not specified'}
- Target Audience: ${bv.targetAudience || 'General audience'}
- Brand Personality: ${bv.brandPersonality || 'Professional'}

TONE & VOICE:
- Tone: ${bv.tone || 'Professional'}
- Voice Attributes: ${bv.voiceAttributes || 'Clear and engaging'}
- Formality Level: ${bv.formalityLevel || 'Balanced'}
- Humor Style: ${bv.humorStyle || 'None'}

CONTENT STYLE:
- Writing Style: ${bv.writingStyle || 'Clear and concise'}
- Sentence Length: ${bv.sentenceLength || 'Mixed'}
- Emoji Usage: ${bv.emojiUsage || 'Minimal'}
- Punctuation Style: ${bv.punctuationStyle || 'Standard'}

CALLS TO ACTION:
- Primary CTA: ${bv.primaryCTA || 'Learn more'}
- Secondary CTA: ${bv.secondaryCTA || 'Contact us'}
- CTA Style: ${bv.ctaStyle || 'Direct'}

HASHTAG STRATEGY:
- Hashtag Count: ${bv.hashtagCount || '3-5'}
- Hashtag Style: ${bv.hashtagStyle || 'Mixed'}
- Custom Hashtags: ${bv.customHashtags || 'None'}

VISUAL & FORMATTING:
- Line Break Style: ${bv.lineBreakStyle || 'Paragraph breaks'}
- Caption Length Preference: ${bv.captionLengthPreference || 'Medium'}
- Opening Hook Style: ${bv.openingHookStyle || 'Question or statement'}

PERSONAL TOUCHES:
- Brand Story Elements: ${bv.brandStoryElements || 'None'}
- Values to Highlight: ${bv.valuesToHighlight || 'Quality and service'}
- Topics to Avoid: ${bv.topicsToAvoid || 'None'}
- Special Instructions: ${bv.specialInstructions || 'None'}
`;
  } else if (typeof brandVoiceData === 'string') {
    brandContext = `Brand voice: ${brandVoiceData}`;
  }

  let prompt;
  if (variantType === 'improve' && draft) {
    prompt = `Improve the following social media caption using this brand voice profile:
${brandContext}

Keep key information intact, tighten the hook, enhance clarity, and end with a strong CTA.

Draft:
"""${draft}"""`;
  } else {
    prompt = `Write ${description} for social media using this brand voice profile:
${brandContext}

Include a clear CTA, line breaks for readability, and keep it audience-friendly.`;
    if (draft) {
      prompt += `

Use this context as inspiration:
"""${draft}"""`;
    }
  }

  const temperatureMap = {
    playful: 0.8,
    long: 0.65,
    short: 0.55,
    improve: 0.6,
    standard: 0.6
  };
  const temp = temperatureMap[variantType] ?? 0.6;
  const maxTokens = variantType === 'long' ? 600 : 380;

  const content = await runChat([{ role: 'user', content: prompt }], { temperature: temp, maxTokens });
  if (!content) {
    return {
      caption: draft || '[Add your OpenAI API key to enable AI captioning]',
      variant: variantType,
      ...noKeyFallback('Add OPENAI_API_KEY to enable AI captions')
    };
  }
  return { caption: content, variant: variantType };
}

export async function generateHashtags(topic = 'architecture visualization unreal engine barndominium', style = 'broad', brandVoiceData = {}) {
  const customHashtags = brandVoiceData?.customHashtags || '';
  const hashtagCount = brandVoiceData?.hashtagCount || '10-15';
  const hashtagStyle = brandVoiceData?.hashtagStyle || style;
  
  let prompt = `Generate hashtags for the topic: ${topic}. Style: ${hashtagStyle}. Target count: ${hashtagCount}. Mix broad and niche tags, avoid banned or repetitive tags.`;
  
  if (customHashtags && customHashtags !== 'None') {
    prompt += ` Always include these custom brand hashtags: ${customHashtags}.`;
  }
  
  prompt += ` Output as a space-separated list.`;
  
  const content = await runChat([{ role: 'user', content: prompt }], { temperature: 0.5 });
  if (!content) {
    return {
      hashtags: ['#render', '#design', '#contentstudio'],
      style: hashtagStyle,
      ...noKeyFallback('Add OPENAI_API_KEY to enable hashtag generation')
    };
  }
  const line = content.replace(/\n/g, ' ').trim();
  const tags = Array.from(new Set(line.split(/\s+/).filter(t => t.startsWith('#')))).slice(0, 30);
  return { hashtags: tags, style: hashtagStyle };
}

export async function generateAltText(mediaUrl, brandVoiceData = {}) {
  const tone = brandVoiceData?.tone || 'descriptive';
  const industry = brandVoiceData?.industry || 'general';
  
  const prompt = `Craft descriptive, accessible alt text (max 150 characters) for this media asset: ${mediaUrl}. Industry context: ${industry}. Tone: ${tone}. Prioritize clarity for screen readers while maintaining brand voice.`;
  const content = await runChat([{ role: 'user', content: prompt }], { temperature: 0.4, maxTokens: 120 });
  if (!content) {
    return {
      altText: 'High-contrast image — describe key scene once OpenAI is configured.',
      ...noKeyFallback('Add OPENAI_API_KEY to enable alt text generation')
    };
  }
  return { altText: content };
}

export async function generateContentCalendar(brandVoiceData = {}, upcomingEvents = []) {
  const businessName = brandVoiceData?.businessName || 'your business';
  const industry = brandVoiceData?.industry || 'general';
  const targetAudience = brandVoiceData?.targetAudience || 'general audience';
  const tone = brandVoiceData?.tone || 'professional';
  const valuesToHighlight = brandVoiceData?.valuesToHighlight || 'quality and service';
  
  const prompt = `Create a 4-week social media content calendar for ${businessName} in the ${industry} industry.

Target Audience: ${targetAudience}
Brand Tone: ${tone}
Core Values: ${valuesToHighlight}
Upcoming Events: ${JSON.stringify(upcomingEvents)}

For each week, provide:
- Theme/title
- Suggested caption (<= 600 chars)
- Hashtag list (<= 10 tags)

Return as a JSON array.`;
  
  const content = await runChat([
    { role: 'system', content: 'You are a senior social strategist returning valid JSON.' },
    { role: 'user', content: prompt }
  ], { temperature: 0.6, maxTokens: 800 });
  if (!content) {
    return {
      calendar: [
        {
          week: 1,
          theme: 'Launch Teaser',
          caption: 'Preview what is coming soon. Configure OpenAI for bespoke copy.',
          hashtags: ['#comingsoon', '#contentstudio']
        }
      ],
      ...noKeyFallback('Add OPENAI_API_KEY to enable content calendar generation')
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    // attempt to fix by wrapping in brackets if needed
    try {
      parsed = JSON.parse(content.replace(/```json|```/g, ''));
    } catch (e) {
      throw new Error('Failed to parse content calendar JSON from model');
    }
  }
  return { calendar: parsed };
}
