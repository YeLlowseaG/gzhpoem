/**
 * 公众号监控定时任务服务
 * 自动定时检查公众号更新
 */

const cron = require('node-cron');

class MonitorScheduler {
    constructor(wechatMonitorService, monitorStorageService) {
        this.wechatMonitorService = wechatMonitorService;
        this.monitorStorageService = monitorStorageService;
        this.isRunning = false;
        this.lastRunTime = null;
        this.tasks = new Map();
    }

    /**
     * 启动定时任务
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ 定时任务已在运行');
            return;
        }

        console.log('🚀 启动公众号监控定时任务');
        
        // 每天早上9点自动检查
        this.tasks.set('daily', cron.schedule('0 9 * * *', async () => {
            console.log('📅 执行每日定时检查');
            await this.runFullCheck('每日定时检查');
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        }));

        // 每4小时检查一次
        this.tasks.set('frequent', cron.schedule('0 */4 * * *', async () => {
            console.log('🔄 执行高频定时检查');
            await this.runFullCheck('高频定时检查');
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        }));

        // 每天晚上2点清理过期数据
        this.tasks.set('cleanup', cron.schedule('0 2 * * *', async () => {
            console.log('🧹 执行数据清理任务');
            await this.runCleanup();
        }, {
            scheduled: false,
            timezone: 'Asia/Shanghai'
        }));

        // 启动所有任务
        this.tasks.forEach((task, name) => {
            task.start();
            console.log(`✅ ${name} 定时任务已启动`);
        });

        this.isRunning = true;
        console.log('✅ 所有定时任务启动完成');
    }

    /**
     * 停止定时任务
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ 定时任务未运行');
            return;
        }

        console.log('⏹️ 停止公众号监控定时任务');
        
        this.tasks.forEach((task, name) => {
            task.stop();
            console.log(`⏹️ ${name} 定时任务已停止`);
        });

        this.tasks.clear();
        this.isRunning = false;
        console.log('✅ 所有定时任务已停止');
    }

    /**
     * 执行完整检查
     */
    async runFullCheck(triggerType = '手动触发') {
        try {
            console.log(`🔍 开始执行完整检查 (${triggerType})`);
            const startTime = new Date();
            
            // 获取所有活跃账号
            const { accounts } = await this.monitorStorageService.getAccounts();
            const activeAccounts = accounts.filter(acc => acc.status === 'active');
            
            if (activeAccounts.length === 0) {
                console.log('📭 没有活跃的监控账号，跳过检查');
                return {
                    success: true,
                    message: '没有活跃的监控账号',
                    accounts: 0,
                    articles: 0
                };
            }

            console.log(`📊 开始检查 ${activeAccounts.length} 个活跃账号`);
            
            // 批量监控
            const results = await this.wechatMonitorService.monitorAccounts(activeAccounts);
            
            // 处理结果
            let totalNewArticles = 0;
            let successCount = 0;
            let errorCount = 0;
            
            for (const result of results) {
                if (result.success) {
                    successCount++;
                    totalNewArticles += result.articles.length;
                    
                    // 保存文章
                    await this.monitorStorageService.saveAccountArticles(
                        result.account.id, 
                        result.articles
                    );
                    
                    // 更新账号状态
                    await this.monitorStorageService.updateAccountLastChecked(
                        result.account.id, 
                        result.articles
                    );
                    
                    if (result.articles.length > 0) {
                        console.log(`📰 ${result.account.name}: 新增 ${result.articles.length} 篇文章`);
                    }
                } else {
                    errorCount++;
                    console.error(`❌ ${result.account.name}: ${result.error}`);
                }
            }
            
            const endTime = new Date();
            const duration = Math.round((endTime - startTime) / 1000);
            this.lastRunTime = endTime.toISOString();
            
            const summary = {
                success: true,
                triggerType,
                duration: `${duration}秒`,
                timestamp: this.lastRunTime,
                accounts: {
                    total: activeAccounts.length,
                    success: successCount,
                    error: errorCount
                },
                articles: {
                    total: totalNewArticles,
                    new: results.reduce((sum, r) => sum + (r.articles?.filter(a => a.isNew).length || 0), 0)
                }
            };
            
            console.log(`✅ 完整检查完成 (${triggerType})`);
            console.log(`📊 耗时: ${duration}秒, 成功: ${successCount}/${activeAccounts.length}, 新文章: ${totalNewArticles}篇`);
            
            return summary;
            
        } catch (error) {
            console.error(`❌ 完整检查失败 (${triggerType}):`, error);
            return {
                success: false,
                error: error.message,
                triggerType,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 执行数据清理
     */
    async runCleanup() {
        try {
            console.log('🧹 开始执行数据清理');
            
            // 清理30天前的文章
            const cleanupResult = await this.monitorStorageService.cleanupOldArticles(30);
            
            if (cleanupResult.success) {
                console.log(`✅ 数据清理完成，清理了 ${cleanupResult.cleaned} 条过期记录`);
            } else {
                console.error('❌ 数据清理失败:', cleanupResult.error);
            }
            
            return cleanupResult;
            
        } catch (error) {
            console.error('❌ 数据清理异常:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 手动触发完整检查
     */
    async triggerManualCheck() {
        console.log('🔄 手动触发完整检查');
        return await this.runFullCheck('手动触发');
    }

    /**
     * 获取调度器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            activeTasks: Array.from(this.tasks.keys()),
            nextRuns: this.getNextRunTimes()
        };
    }

    /**
     * 获取下次运行时间
     */
    getNextRunTimes() {
        const nextRuns = {};
        
        this.tasks.forEach((task, name) => {
            if (task.getStatus() === 'scheduled') {
                // 这里需要根据cron表达式计算下次运行时间
                // 简化处理，返回描述
                switch (name) {
                    case 'daily':
                        nextRuns[name] = '每天早上9点';
                        break;
                    case 'frequent':
                        nextRuns[name] = '每4小时';
                        break;
                    case 'cleanup':
                        nextRuns[name] = '每天凌晨2点';
                        break;
                }
            }
        });
        
        return nextRuns;
    }

    /**
     * 更新任务配置
     */
    updateSchedule(taskName, cronExpression) {
        if (this.tasks.has(taskName)) {
            this.tasks.get(taskName).stop();
            this.tasks.delete(taskName);
        }
        
        // 创建新任务
        const newTask = cron.schedule(cronExpression, async () => {
            console.log(`⏰ 执行 ${taskName} 定时任务`);
            await this.runFullCheck(`${taskName} 定时任务`);
        }, {
            scheduled: this.isRunning,
            timezone: 'Asia/Shanghai'
        });
        
        this.tasks.set(taskName, newTask);
        console.log(`✅ ${taskName} 定时任务已更新: ${cronExpression}`);
    }

    /**
     * 获取监控统计
     */
    async getMonitorStats() {
        try {
            const stats = await this.monitorStorageService.getStats();
            return {
                ...stats.stats,
                scheduler: this.getStatus()
            };
        } catch (error) {
            console.error('获取监控统计失败:', error);
            return null;
        }
    }
}

module.exports = MonitorScheduler;