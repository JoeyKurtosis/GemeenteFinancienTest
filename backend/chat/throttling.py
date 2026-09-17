from rest_framework.throttling import UserRateThrottle

# Two limits on the same endpoint, because they stop different things.
#
# The burst rate stops a runaway client — a retry loop, a stuck component — from emptying the
# quota in a minute. The daily rate is the cost ceiling: a chat turn that uses tools can cost
# several upstream calls, and one enthusiastic user should not be able to spend the whole
# project's free tier before lunch.
#
# UserRateThrottle keys signed-in callers by user id and anonymous callers by IP. The latter is
# the active protection while the assistant is public; switching the view back to an
# authenticated permission later needs no throttle change.
#
# Counters live in CACHES, which is LocMemCache and therefore per-process: with N gunicorn
# workers the effective limit is roughly N times the configured rate. Deliberate — see the
# comment on CACHES in settings.py — but worth knowing when picking the numbers.


class ChatBurstThrottle(UserRateThrottle):
    scope = "chat_burst"


class ChatDailyThrottle(UserRateThrottle):
    scope = "chat_daily"
