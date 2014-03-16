
var buildServiceManager = (function() {
    "use strict";

    function trimList(list, minTime) {
        var indexOfIntervalStart = -1, i = 0;

        list.some(function(t) {
            if (t > minTime) {
                indexOfIntervalStart = i;
                return true;
            }
            i++;
        });

        if (indexOfIntervalStart < 0) {
            return [];
        }
        return list.slice(indexOfIntervalStart);
    }

    return function() {
        var manager = {}, services = [];

        manager.getTime = function() {
            return Math.floor(new Date().getTime() / 1000);
        };

        manager.add = function(callback, quota) {
            services.push({
                callback: callback,
                quota: quota
            });
        };

        manager.call = function(data, onQuotaExhausted) {
            var bestService, highestQuota = 0;
            services.forEach(function(service) {
                var quota = service.quota();
                if (quota > highestQuota) {
                    bestService = service;
                    highestQuota = quota;
                }
            });
            if (bestService) {
                bestService.quota.consumeOne();
                bestService.callback(data);
            } else if (onQuotaExhausted) {
                onQuotaExhausted(data);
            }
        };

        function buildQuota(intervalInSecs, fnStrategy) {
            var consumptionHistory = [], requestHistory = [],

            quota = function() {
                var startOfInterval = manager.getTime() - intervalInSecs;
                requestHistory.push(manager.getTime());
                consumptionHistory = trimList(consumptionHistory, startOfInterval);
                requestHistory = trimList(requestHistory, startOfInterval);
                return fnStrategy(consumptionHistory, requestHistory);
            };

            quota.consumeOne = function() {
                consumptionHistory.push(manager.getTime());
            };

            return quota;
        }
        manager.buildGreedyQuota = function(intervalInSecs, quotaForInterval, priority) {
            // Returns 1 if anything left
            priority = priority || 1;

            return buildQuota(intervalInSecs, function(consumptionHistory) {
                return quotaForInterval > consumptionHistory.length ? priority : 0;
            });
        };

        manager.buildSmoothQuota = function(intervalInSecs, quotaForInterval, burstiness) {
            burstiness = burstiness || 1;// high burstiness = small buckets

            if (burstiness <= 0) {
                throw new Error('burstiness must be > 0');
            }
            var bucketSize = intervalInSecs / burstiness, bucketQuota = quotaForInterval / burstiness;

            return buildQuota(intervalInSecs, function(consumptionHistory) {
                var usedInThisBucket = trimList(consumptionHistory, manager.getTime() - bucketSize).length;

                if (usedInThisBucket < bucketQuota) {
                    return (bucketQuota - usedInThisBucket) / bucketQuota;
                }
                return 0;
            });
        };

        return manager;
    };
}());
