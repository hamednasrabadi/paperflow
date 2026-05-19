# Notes on Loss Aversion

Standard economic theory assumes people maximize expected value. Faced with two options, you compute the expected payoff of each and pick the higher one. Clean, mathematical, wrong.

In 1979 Kahneman and Tversky showed something more interesting. **Losses hurt about twice as much as equivalent gains feel good**. That single asymmetry blows up the rational-agent model and quietly explains a startling amount of real-world behavior.

## The Math

In **prospect theory**, the subjective value of an outcome $x$ measured from some reference point isn't simply $x$, but:

$$v(x) = \begin{cases} x^\alpha & \text{if } x \geq 0 \\ -\lambda \cdot (-x)^\beta & \text{if } x < 0 \end{cases}$$

with $\alpha, \beta \approx 0.88$ (the curve is concave for gains, convex for losses) and $\lambda \approx 2.25$ (the loss-aversion coefficient).

That $\lambda$ is the punchline. A \$100 loss subjectively feels like a \$225 hit. A \$100 gain only feels like an \$88 win. The asymmetry is built in.

## A Few Experimental Findings

| Setup | Standard prediction | Actual choice |
|---|---|---|
| 50% to win \$200 or 50% to win \$0, vs. guaranteed \$90 | Take the gamble (EV \$100 > \$90) | Most people take the \$90 |
| 50% to lose \$200 or 50% to lose \$0, vs. guaranteed -\$90 | Take the guaranteed loss (EV -\$100 < -\$90) | Most people take the gamble |
| Endowed with a mug, asked to sell | Indifferent at fair price | Demand roughly 2x the buying price |
| Insurance against low-probability disasters | Rarely worth it in expectation | Buy aggressively |

The pattern is consistent: people are **risk-averse for gains** and **risk-seeking for losses**. They'll lock in a smaller sure win, but they'll gamble to avoid a sure loss.

## Quick Simulation

A toy comparison of expected-value vs. prospect-theory predictions:

```python
def prospect_value(x, alpha=0.88, lam=2.25):
    if x >= 0:
        return x ** alpha
    return -lam * (-x) ** alpha

# Coin flip: +$200 vs. $0
gamble_pv = 0.5 * prospect_value(200) + 0.5 * prospect_value(0)
sure_pv   = prospect_value(90)

print(f"Gamble:   PT value = {gamble_pv:.1f}   (EV = $100)")
print(f"Sure $90: PT value = {sure_pv:.1f}   (EV = $90)")
# Sure $90 wins on PT value, matching observed behavior.
```

Run it for losses (flip the signs). The gamble wins on PT value, which is exactly why people gamble to dodge a sure loss.

> What looks like irrationality is often the visible surface of a deeper, evolutionarily tuned utility function. The mistake isn't the human's. It's the model's.

---

## Prompt :
Isn't loss aversion just risk aversion in another form?

## Response :
No, and the distinction matters. Standard risk aversion lives inside a globally concave utility function. Prospect theory says people are concave for gains *and convex for losses*. The kink at zero produces behavior no smooth utility function can fit. Loss aversion is a separate parameter, and ignoring it produces consistently wrong predictions in insurance pricing, negotiation, and most retail markets.

---

## یک یادداشت پایانی

نظریه چشم‌انداز یکی از مهم‌ترین نقاط اتصال میان اقتصاد و روان‌شناسی است. کانمن و تورسکی نشان دادند که انسان‌ها نه عقلانی محض هستند و نه کاملاً غیرعقلانی؛ آن‌ها به شیوه‌ای نظام‌مند و قابل پیش‌بینی از مدل‌های کلاسیک منحرف می‌شوند. این یادداشت با اپ موبایلی **PaperFlow** نوشته و به PDF تبدیل شد.
