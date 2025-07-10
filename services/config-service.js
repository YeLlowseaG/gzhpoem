const fs = require('fs').promises;
const path = require('path');

class ConfigService {
    constructor() {
        this.configFile = path.join(__dirname, '../data/config.json');
        this.defaultConfig = {
            ai: {
                provider: 'qwen',
                providers: {
                    qwen: {
                        enabled: true,
                        apiKey: process.env.QWEN_API_KEY || ''
                    },
                    openai: {
                        enabled: false,
                        apiKey: process.env.OPENAI_API_KEY || ''
                    },
                    deepseek: {
                        enabled: false,
                        apiKey: process.env.DEEPSEEK_API_KEY || ''
                    }
                }
            },
            wechat: {
                appId: process.env.WECHAT_APPID || '',
                appSecret: process.env.WECHAT_SECRET || '',
                autoUpload: false
            },
            generation: {
                defaultStyle: 'popular',
                defaultTemplate: 'standard',
                maxLength: 1200,
                minLength: 800,
                includeImages: true,
                imageCount: 3
            },
            storage: {
                maxArticles: 1000,
                autoCleanup: true,
                cleanupDays: 90
            },
            ui: {
                theme: 'light',
                language: 'zh',
                autoSave: true
            }
        };
        
        this.config = { ...this.defaultConfig };
        this.loadConfig();
    }

    /**
     * 加载配置
     */
    async loadConfig() {
        try {
            const data = await fs.readFile(this.configFile, 'utf-8');
            const savedConfig = JSON.parse(data);
            
            // 合并默认配置和保存的配置
            this.config = this.mergeConfig(this.defaultConfig, savedConfig);
            
            console.log('✅ 配置加载完成');
        } catch (error) {
            console.log('📝 配置文件不存在，使用默认配置');
            await this.saveConfig(this.defaultConfig);
        }
    }

    /**
     * 深度合并配置
     */
    mergeConfig(defaultConfig, savedConfig) {
        const merged = { ...defaultConfig };
        
        for (const key in savedConfig) {
            if (savedConfig.hasOwnProperty(key)) {
                if (typeof savedConfig[key] === 'object' && savedConfig[key] !== null && !Array.isArray(savedConfig[key])) {
                    merged[key] = this.mergeConfig(merged[key] || {}, savedConfig[key]);
                } else {
                    merged[key] = savedConfig[key];
                }
            }
        }
        
        return merged;
    }

    /**
     * 保存配置
     */
    async saveConfig(config) {
        try {
            this.config = config ? this.mergeConfig(this.defaultConfig, config) : this.config;
            
            // 确保目录存在
            const dataDir = path.dirname(this.configFile);
            await fs.mkdir(dataDir, { recursive: true });
            
            await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
            
            console.log('✅ 配置保存成功');
        } catch (error) {
            console.error('❌ 配置保存失败:', error);
            throw error;
        }
    }

    /**
     * 获取配置
     */
    async getConfig() {
        return {
            ...this.config,
            // 隐藏敏感信息
            ai: {
                ...this.config.ai,
                providers: Object.keys(this.config.ai.providers).reduce((acc, key) => {
                    acc[key] = {
                        ...this.config.ai.providers[key],
                        apiKey: this.config.ai.providers[key].apiKey ? '***已配置***' : ''
                    };
                    return acc;
                }, {})
            },
            wechat: {
                ...this.config.wechat,
                appSecret: this.config.wechat.appSecret ? '***已配置***' : ''
            }
        };
    }

    /**
     * 获取完整配置（包含敏感信息）
     */
    getFullConfig() {
        return this.config;
    }

    /**
     * 更新配置
     */
    async updateConfig(updates) {
        try {
            const newConfig = this.mergeConfig(this.config, updates);
            await this.saveConfig(newConfig);
            return newConfig;
        } catch (error) {
            console.error('❌ 更新配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取AI配置
     */
    getAIConfig() {
        return this.config.ai;
    }

    /**
     * 获取微信配置
     */
    getWechatConfig() {
        return this.config.wechat;
    }

    /**
     * 获取生成配置
     */
    getGenerationConfig() {
        return this.config.generation;
    }

    /**
     * 获取存储配置
     */
    getStorageConfig() {
        return this.config.storage;
    }

    /**
     * 获取UI配置
     */
    getUIConfig() {
        return this.config.ui;
    }

    /**
     * 更新AI配置
     */
    async updateAIConfig(aiConfig) {
        return this.updateConfig({ ai: aiConfig });
    }

    /**
     * 更新微信配置
     */
    async updateWechatConfig(wechatConfig) {
        return this.updateConfig({ wechat: wechatConfig });
    }

    /**
     * 更新生成配置
     */
    async updateGenerationConfig(generationConfig) {
        return this.updateConfig({ generation: generationConfig });
    }

    /**
     * 检查配置是否有效
     */
    validateConfig() {
        const errors = [];
        
        // 检查AI配置
        const aiConfig = this.getAIConfig();
        if (!aiConfig.provider || !aiConfig.providers[aiConfig.provider]) {
            errors.push('AI服务提供商配置无效');
        }
        
        const currentProvider = aiConfig.providers[aiConfig.provider];
        if (!currentProvider.enabled || !currentProvider.apiKey) {
            errors.push(`${aiConfig.provider} AI服务未正确配置`);
        }
        
        // 检查微信配置（如果启用了自动上传）
        const wechatConfig = this.getWechatConfig();
        if (wechatConfig.autoUpload && (!wechatConfig.appId || !wechatConfig.appSecret)) {
            errors.push('微信公众号配置不完整');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 重置配置
     */
    async resetConfig() {
        try {
            await this.saveConfig(this.defaultConfig);
            console.log('✅ 配置已重置为默认值');
        } catch (error) {
            console.error('❌ 重置配置失败:', error);
            throw error;
        }
    }

    /**
     * 导出配置
     */
    async exportConfig() {
        return {
            ...this.config,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * 导入配置
     */
    async importConfig(configData) {
        try {
            // 验证配置格式
            if (!configData || typeof configData !== 'object') {
                throw new Error('配置格式无效');
            }
            
            // 移除时间戳
            delete configData.exportedAt;
            
            await this.saveConfig(configData);
            console.log('✅ 配置导入成功');
        } catch (error) {
            console.error('❌ 导入配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取环境变量配置
     */
    getEnvConfig() {
        return {
            ai: {
                qwen: process.env.QWEN_API_KEY ? '已配置' : '未配置',
                openai: process.env.OPENAI_API_KEY ? '已配置' : '未配置',
                deepseek: process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置'
            },
            wechat: {
                appId: process.env.WECHAT_APPID ? '已配置' : '未配置',
                appSecret: process.env.WECHAT_SECRET ? '已配置' : '未配置'
            },
            server: {
                port: process.env.PORT || 3001,
                nodeEnv: process.env.NODE_ENV || 'development'
            }
        };
    }

    /**
     * 监听配置变化
     */
    onConfigChange(callback) {
        // 简单实现，可以扩展为文件监听
        this.configChangeCallback = callback;
    }

    /**
     * 触发配置变化事件
     */
    triggerConfigChange() {
        if (this.configChangeCallback) {
            this.configChangeCallback(this.config);
        }
    }
}

module.exports = ConfigService;