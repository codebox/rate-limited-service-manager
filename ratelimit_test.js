describe("ratelimit", function() {
    var manager, t, callback1, callback2, callback3;

    beforeEach(function() {
        manager = buildServiceManager();
        manager.getTime = function() {
            return t;
        }
        callback1 = makeCallback();
        callback2 = makeCallback();
        callback3 = makeCallback();
        t = 0;
    });

    function makeCallback() {
        var fn = function() {
            fn.callCount++;
        };
        fn.callCount = 0;
        return fn;
    }

    function callAndCheckCount(expectedCount) {
        manager.call();
        expect(callback1.callCount).toBe(expectedCount);
    }

    function callAndCheckCounts(callback1Count, callback2Count, callback3Count) {
        manager.call();
        expect(callback1.callCount).toBe(callback1Count);
        expect(callback2.callCount).toBe(callback2Count);
        expect(callback3.callCount).toBe(callback3Count);
    }

    describe("greedyQuota", function() {
        it("behaves correctly for quota of 1", function() {
            var quota = manager.buildGreedyQuota(60, 1);
            manager.add(callback1, quota);

            callAndCheckCount(1);

            t = 1;
            callAndCheckCount(1);

            t = 59;
            callAndCheckCount(1);

            t = 60;
            callAndCheckCount(2);
        });
        it("behaves correctly for quota of more than 1", function() {
            var quota = manager.buildGreedyQuota(60, 3);
            manager.add(callback1, quota);

            callAndCheckCount(1);
            callAndCheckCount(2);

            t = 1;
            callAndCheckCount(3);
            callAndCheckCount(3);

            t = 2;
            callAndCheckCount(3);

            t = 59;
            callAndCheckCount(3);

            t = 60;
            callAndCheckCount(4);
            callAndCheckCount(5);

            t = 61;
            callAndCheckCount(6);
            callAndCheckCount(6);
        });
        it("multiple quotas behave correctly according to their priorities", function() {
            var quota1 = manager.buildGreedyQuota(60, 1, 1);
            manager.add(callback1, quota1);
            var quota2 = manager.buildGreedyQuota(60, 1, 2);
            manager.add(callback2, quota2);
            var quota3 = manager.buildGreedyQuota(60, 1, 3);
            manager.add(callback3, quota3);

            callAndCheckCounts(0, 0, 1);
            callAndCheckCounts(0, 1, 1);
            callAndCheckCounts(1, 1, 1);
            callAndCheckCounts(1, 1, 1);
            callAndCheckCounts(1, 1, 1);
            callAndCheckCounts(1, 1, 1);
        });
    });

    describe("smoothQuota", function() {
        it("behaves correctly for quota of 1", function() {
            var quota = manager.buildSmoothQuota(60, 1);
            manager.add(callback1, quota);

            callAndCheckCount(1);
            t = 1;
            callAndCheckCount(1);
            t = 59;
            callAndCheckCount(1);
            t = 60;
            callAndCheckCount(2);
        });
        it("behaves correctly for quota of more than 1", function() {
            var quota = manager.buildSmoothQuota(60, 3);
            manager.add(callback1, quota);

            callAndCheckCount(1);
            callAndCheckCount(2);
            t = 1;
            callAndCheckCount(3);
            callAndCheckCount(3);
            t = 2;
            callAndCheckCount(3);
            t = 59;
            callAndCheckCount(3);
            t = 60;
            callAndCheckCount(4);
            callAndCheckCount(5);
            callAndCheckCount(5);
            t = 61;
            callAndCheckCount(6);
            callAndCheckCount(6);
        });
        it("multiple quotas behave correctly according to how much of their quota is left", function() {
            var quota1 = manager.buildSmoothQuota(60, 1);
            manager.add(callback1, quota1);
            var quota2 = manager.buildSmoothQuota(60, 2);
            manager.add(callback2, quota2);
            var quota3 = manager.buildSmoothQuota(60, 3);
            manager.add(callback3, quota3);

            callAndCheckCounts(1, 0, 0);
            callAndCheckCounts(1, 1, 0);
            callAndCheckCounts(1, 1, 1);
            callAndCheckCounts(1, 1, 2);
            callAndCheckCounts(1, 2, 2);
            callAndCheckCounts(1, 2, 3);
            callAndCheckCounts(1, 2, 3);
        });
        it("smooths quota correctly", function() {
            var quota = manager.buildSmoothQuota(60, 20, 10);
            manager.add(callback1, quota);

            callAndCheckCount(1);
            callAndCheckCount(2);
            callAndCheckCount(2);
            callAndCheckCount(2);

            t = 5;
            callAndCheckCount(2);

            t = 6
            callAndCheckCount(3);
            callAndCheckCount(4);
            callAndCheckCount(4);
            callAndCheckCount(4);

            t = 12
            callAndCheckCount(5);

            t = 13;
            callAndCheckCount(6);
            callAndCheckCount(6);

            t = 18
            callAndCheckCount(7);
            callAndCheckCount(7);

            t = 19;
            callAndCheckCount(8);
            callAndCheckCount(8);
        });
    });

    it("calls error handler if no quota left", function() {
        var quota = manager.buildGreedyQuota(60, 1, 1), quotaExhausted = false, callbackData, data = {};
        manager.add(callback1, quota);

        callAndCheckCount(1);
        manager.call(data, function(p) {
            quotaExhausted = true;
            callbackData = p;
        });
        expect(quotaExhausted).toBe(true);
        expect(callbackData).toBe(data);
    });

    it("data object is passed on to service call", function() {
        var quota = manager.buildGreedyQuota(60, 1, 1), callbackData, data = {};
        manager.add(function(p) {
            callbackData = p;
        }, quota);

        manager.call(data);
        expect(callbackData).toBe(data);
    });
});