# Feature Specification: China Accessibility Testing

## Implementation Status

> **Branch:** TBD
> **Last Updated:** 2025-12-28

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1: Testing** | Pending | Test Cloudflare Worker relay from China |
| **Phase 2: Optimization** | Pending | Address any latency/connectivity issues |

---

## 1. Overview

Verify that Preppal works reliably for users in mainland China without requiring VPN/firewall bypass.

## 2. Problem Statement

Channel partner feedback indicates their students are primarily in China where:
- Google services (including Gemini API) are blocked
- VPN usage is unreliable and creates friction
- Users expect software to "just work" without technical workarounds

## 3. Current Architecture

Preppal uses a Cloudflare Worker as a relay to the Gemini Live API:

```
User (China) → Cloudflare Edge → Worker → Gemini API
```

**Hypothesis:** Cloudflare's global edge network should allow Chinese users to connect to the worker, which then proxies requests to Gemini. This may work because:
- Cloudflare has edge nodes accessible from China
- The Gemini API call originates from Cloudflare's infrastructure, not the user's device

## 4. Testing Plan

### 4.1 Test Scenarios

| # | Scenario | Method | Success Criteria |
|---|----------|--------|------------------|
| 1 | Basic connectivity | Access preppal.com from China | Page loads < 5s |
| 2 | Authentication | Sign in via email OTP | OTP received, login successful |
| 3 | Interview creation | Create interview with JD/resume | Interview created, lobby accessible |
| 4 | WebSocket connection | Start interview session | WebSocket connects to worker |
| 5 | Gemini streaming | Conduct full interview | Audio/text streams without drops |
| 6 | Feedback generation | Complete interview | Feedback generated successfully |

### 4.2 Test Methods

1. **VPN simulation** - Connect via China VPN endpoint (limited accuracy)
2. **Partner testing** - Have channel partner test from actual China location
3. **Cloud VM** - Spin up VM in Chinese cloud provider (Alibaba Cloud)

### 4.3 Metrics to Collect

- Time to first byte (TTFB)
- WebSocket connection latency
- Audio streaming latency (round-trip)
- Connection drop rate
- Error types and frequency

## 5. Potential Issues & Mitigations

| Issue | Likelihood | Mitigation |
|-------|------------|------------|
| Cloudflare blocked | Low | Use custom domain with different CDN |
| High latency | Medium | Optimize worker location, reduce payload |
| WebSocket drops | Medium | Implement reconnection logic |
| DNS issues | Low | Provide IP-based fallback |

## 6. Out of Scope

- Building China-specific infrastructure
- ICP license/compliance (requires legal review)
- WeChat mini-program integration

## 7. Next Steps

1. Coordinate with channel partner for real-world testing
2. Document results and any issues found
3. Create follow-up features if issues identified

---

**Note:** This is a testing/validation feature, not an implementation feature. Actual fixes will be scoped separately based on test results.
