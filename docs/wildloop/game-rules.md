# Territory game rules

## Eligible activities

Only a live `web_gps` activity recorded in `capture` mode can score. The server requires at least 20 ordered samples, at least two minutes and 100 metres, recent completion, timestamps on every sample, and device accuracy of 75 metres or better on at least 80% of samples. Speed is capped at 12 m/s for runs, hikes, and walks and 25 m/s for bikes.

Manual activities, route previews/simulations, imported files, Garmin summary-only webhooks, and free runs are deliberately non-scoring. They remain useful activity records.

## Claims

A new claim must form a loop whose endpoints are within 50 metres. It must enclose between 1,000 and 5,000,000 square metres, avoid existing active/contested territory, and avoid the athlete's protected home zone. Claim creation, history, XP, and holding counters commit in one serializable transaction.

## Battles

An eligible route intersecting another athlete's territory creates one of these outcomes:

- `conquered`: a complete takeover of a small territory.
- `split`: the defender keeps the larger portion and the attacker receives a valid smaller portion.
- `contested`: an intersection or sliver too small to capture.
- `defended`: the owner traverses contested territory.

A focus target restricts processing to the selected territory. Every persisted battle is exposed by the battle feed, which clients refresh every 15 seconds.

## Decay and ranks

Territory ranks recompute hourly. Decay runs daily at 03:10 UTC and counter repair at 04:10 UTC. Scheduler tasks use overlap locks and the HTTP maintenance routes require the admin role.

