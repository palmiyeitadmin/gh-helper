import chalk from 'chalk';
import { PlmConfig, AIProviderType } from '../config/settings';

// AI Provider Interface
export interface AIProvider {
    name: string;
    generateCommitMessage(diff: string, files: string[]): Promise<string>;
    testConnection(): Promise<boolean>;
}

// Provider bilgileri
export const AI_PROVIDERS: Record<AIProviderType, {
    name: string;
    description: string;
    defaultModel: string;
    models: string[];
    apiUrl: string;
}> = {
    none: {
        name: 'Devre Dışı',
        description: 'Yapay zeka önerileri kapalı',
        defaultModel: '',
        models: [],
        apiUrl: ''
    },
    groq: {
        name: 'Groq',
        description: 'Groq - Ücretsiz, çok hızlı, kredi kartı gerektirmez',
        defaultModel: 'llama-3.3-70b-versatile',
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions'
    },
    gemini: {
        name: 'Google Gemini',
        description: 'Google AI Studio - Ücretsiz tier mevcut',
        defaultModel: 'gemini-2.0-flash',
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-pro'],
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
    },
    deepseek: {
        name: 'DeepSeek',
        description: 'DeepSeek AI - Uygun maliyetli ve güçlü',
        defaultModel: 'deepseek-chat',
        models: ['deepseek-chat', 'deepseek-coder'],
        apiUrl: 'https://api.deepseek.com/v1/chat/completions'
    },
    openai: {
        name: 'OpenAI',
        description: 'ChatGPT modelleri (GPT-4, GPT-3.5)',
        defaultModel: 'gpt-3.5-turbo',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        apiUrl: 'https://api.openai.com/v1/chat/completions'
    },
    anthropic: {
        name: 'Anthropic',
        description: 'Claude modelleri',
        defaultModel: 'claude-3-haiku-20240307',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        apiUrl: 'https://api.anthropic.com/v1/messages'
    },
    minimax: {
        name: 'MiniMax',
        description: 'MiniMax AI - Güçlü ve hızlı',
        defaultModel: 'MiniMax-Text-01',
        models: ['MiniMax-Text-01', 'MiniMax-M1', 'abab6.5s-chat'],
        apiUrl: 'https://api.minimax.chat/v1/text/chatcompletion_v2'
    },
    ollama: {
        name: 'Ollama (Yerel)',
        description: 'Yerel çalışan modeller - API key gerektirmez',
        defaultModel: 'llama2',
        models: ['llama2', 'codellama', 'mistral', 'deepseek-coder'],
        apiUrl: 'http://localhost:11434/api/generate'
    }
};

// Commit mesajı için prompt
function getCommitPrompt(diff: string, files: string[]): string {
    return `Aşağıdaki git diff'i analiz et ve detaylı bir conventional commit mesajı yaz.

Dosyalar: ${files.join(', ')}

Diff:
\`\`\`
${diff.slice(0, 5000)}
\`\`\`

FORMAT (bu formatı MUTLAKA kullan):
<type>(<scope>): <kısa başlık>

<detaylı açıklama paragrafı - en az 3-4 cümle>

- <değişiklik 1>
- <değişiklik 2>
- <değişiklik 3>

KURALLAR:
1. İlk satır: type(scope): kısa başlık (max 72 karakter)
2. Boş satır bırak
3. Detaylı açıklama paragrafı yaz (3-4 cümle, değişikliklerin NE yaptığını ve NEDEN yapıldığını açıkla)
4. Boş satır bırak  
5. Madde işaretli liste ile önemli değişiklikleri listele
6. Türkçe yaz
7. Tipler: feat, fix, docs, style, refactor, test, chore, perf, ci, build

ÖRNEK:
feat(ai): Groq ve Gemini AI provider desteği eklendi

Bu commit ile plmhelper CLI aracına yapay zeka destekli commit mesajı önerisi özelliği eklendi. Kullanıcılar artık Groq veya Google Gemini API kullanarak otomatik commit mesajı alabilirler. AI ayarları menüsünden provider seçimi, API key girişi ve bağlantı testi yapılabilir.

- Groq provider eklendi (ücretsiz, hızlı)
- Gemini provider eklendi (Google AI Studio)
- AI ayarları menüsü oluşturuldu
- Diff filtreleme ile src dosyaları önceliklendirildi`;
}

// Groq Provider (OpenAI uyumlu, ücretsiz)
class GroqProvider implements AIProvider {
    name = 'Groq';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.groq.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: 'Sen bir git commit mesajı uzmanısın. Conventional commit formatında Türkçe mesajlar yaz.' },
                    { role: 'user', content: getCommitPrompt(diff, files) }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content?.trim() || '';
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(AI_PROVIDERS.groq.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Gemini Provider (Google AI Studio)
class GeminiProvider implements AIProvider {
    name = 'Gemini';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Sen bir git commit mesajı uzmanısın. Conventional commit formatında Türkçe mesajlar yaz.\n\n${getCommitPrompt(diff, files)}`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.3
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;

        // Gemini hata kontrolü
        if (data.error) {
            throw new Error(`Gemini API hatası: ${data.error.message}`);
        }

        // Gemini response format: { candidates: [{ content: { parts: [{ text }] } }] }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('Gemini yanıt üretemedi');
        }

        return text.trim();
    }

    async testConnection(): Promise<boolean> {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'test'
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 5
                    }
                })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json() as any;
            if (data.error) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
}

// DeepSeek Provider
class DeepSeekProvider implements AIProvider {
    name = 'DeepSeek';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'deepseek-chat') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.deepseek.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: 'Sen bir git commit mesajı uzmanısın. Conventional commit formatında Türkçe mesajlar yaz.' },
                    { role: 'user', content: getCommitPrompt(diff, files) }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content?.trim() || '';
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(AI_PROVIDERS.deepseek.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
    name = 'OpenAI';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.openai.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: 'Sen bir git commit mesajı uzmanısın. Conventional commit formatında Türkçe mesajlar yaz.' },
                    { role: 'user', content: getCommitPrompt(diff, files) }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content?.trim() || '';
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(AI_PROVIDERS.openai.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Anthropic Provider
class AnthropicProvider implements AIProvider {
    name = 'Anthropic';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.anthropic.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: 500,
                messages: [
                    { role: 'user', content: getCommitPrompt(diff, files) }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as { content: Array<{ text: string }> };
        return data.content[0]?.text?.trim() || '';
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(AI_PROVIDERS.anthropic.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 5,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

// MiniMax Provider
class MiniMaxProvider implements AIProvider {
    name = 'MiniMax';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'MiniMax-Text-01') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.minimax.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: 'Sen bir git commit mesajı uzmanısın. Conventional commit formatında Türkçe mesajlar yaz.' },
                    { role: 'user', content: getCommitPrompt(diff, files) }
                ],
                max_tokens: 500,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`MiniMax API hatası: ${response.status} - ${error}`);
        }

        const data = await response.json() as any;

        // MiniMax hata kontrolü (HTTP 200 döner ama body'de hata olabilir)
        if (data.base_resp && data.base_resp.status_code !== 0) {
            throw new Error(`MiniMax API hatası: ${data.base_resp.status_msg || 'Bilinmeyen hata'} (kod: ${data.base_resp.status_code})`);
        }

        // MiniMax farklı response formatları deneyebilir
        // Format 1: OpenAI uyumlu { choices: [{ message: { content } }] }
        if (data.choices && data.choices[0]?.message?.content) {
            return data.choices[0].message.content.trim();
        }

        // Format 2: { reply } doğrudan
        if (data.reply) {
            return data.reply.trim();
        }

        // Format 3: { output } veya { text }
        if (data.output) {
            return data.output.trim();
        }
        if (data.text) {
            return data.text.trim();
        }

        // Format 4: { result } veya { content }
        if (data.result) {
            return data.result.trim();
        }
        if (data.content) {
            return data.content.trim();
        }

        throw new Error('MiniMax response format tanınamadı: ' + JSON.stringify(data).slice(0, 200));
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(AI_PROVIDERS.minimax.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'test' }],
                    max_tokens: 5
                })
            });

            if (!response.ok) return false;

            // MiniMax body'de hata döndürebilir
            const data = await response.json() as any;
            if (data.base_resp && data.base_resp.status_code !== 0) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
}

// Ollama Provider (Yerel)
class OllamaProvider implements AIProvider {
    name = 'Ollama';
    private model: string;

    constructor(model: string = 'llama2') {
        this.model = model;
    }

    async generateCommitMessage(diff: string, files: string[]): Promise<string> {
        const response = await fetch(AI_PROVIDERS.ollama.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: getCommitPrompt(diff, files),
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama hatası: ${response.status}`);
        }

        const data = await response.json() as { response: string };
        return data.response?.trim() || '';
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            return response.ok;
        } catch {
            return false;
        }
    }
}

// Provider factory
export function createAIProvider(config: PlmConfig): AIProvider | null {
    if (!config.aiEnabled || config.aiProvider === 'none') {
        return null;
    }

    const providerInfo = AI_PROVIDERS[config.aiProvider];
    const model = config.aiModel || providerInfo.defaultModel;

    switch (config.aiProvider) {
        case 'groq':
            if (!config.aiApiKey) return null;
            return new GroqProvider(config.aiApiKey, model);

        case 'gemini':
            if (!config.aiApiKey) return null;
            return new GeminiProvider(config.aiApiKey, model);

        case 'deepseek':
            if (!config.aiApiKey) return null;
            return new DeepSeekProvider(config.aiApiKey, model);

        case 'openai':
            if (!config.aiApiKey) return null;
            return new OpenAIProvider(config.aiApiKey, model);

        case 'anthropic':
            if (!config.aiApiKey) return null;
            return new AnthropicProvider(config.aiApiKey, model);

        case 'minimax':
            if (!config.aiApiKey) return null;
            return new MiniMaxProvider(config.aiApiKey, model);

        case 'ollama':
            return new OllamaProvider(model);

        default:
            return null;
    }
}

// Maskelenmiş API key
export function maskApiKey(key: string | undefined): string {
    if (!key) return '(ayarlanmamış)';
    if (key.length <= 8) return '****';
    return key.slice(0, 4) + '...' + key.slice(-4);
}
