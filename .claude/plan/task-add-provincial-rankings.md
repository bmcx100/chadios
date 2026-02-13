# Task: Add Provincial Rankings Display to Tournament App

## Context
The tournament starts today. We need to seed current provincial rankings for all 11 tournament teams and display the rank next to team names throughout the app. This is a quick addition on top of the existing Phase 1 build — NOT the full Phase 3 rankings system (no trend charts, no history tracking, no entry forms).

## Step 1: Seed Rankings Data

Insert one row per team into the `provincial_rankings` table with today's date. Use the existing team records — match by team name or external_id.

| external_id | Team Name | Rank |
|-------------|-----------|------|
| #2859 | Nepean Wildcats | 4 |
| #6672 | Southpoint Stars | 12 |
| #1484 | Peterborough Ice Kats | 22 |
| #3582 | Markham-Stouffville Stars | 29 |
| #845 | Scarborough Sharks | 44 |
| #3792 | Toronto Leaside Wildcats | 17 |
| #1878 | Napanee Crunch | 20 |
| #6254 | North Bay Junior Lakers | 24 |
| #2328 | Cornwall Typhoons | 34 |
| #310 | Durham West Lightning | 43 |
| #3 | Central York Panthers | 51 |

For all rows:
- `division` = 'U13'
- `level` = 'A'
- `date_recorded` = '2026-02-13'

This can be done in the existing seed script or as a standalone SQL insert.

## Step 2: Display Rankings in the UI

Show each team's provincial rank as a small badge/label wherever team names appear. Format: `#4` or `(4th)` — keep it compact.

### Where to display:

**1. Schedule — Game Cards**
- Next to each team name on every game card.
- Example: `Nepean Wildcats #4  vs  Southpoint Stars #12`
- Keep it subtle (smaller font, muted color) so it doesn't overwhelm the card, but clearly visible.

**2. Pool Standings Tables**
- Add a "Rank" or "PR" (Provincial Rank) column to the standings table.
- Show next to or near the team name column.

**3. Bracket View**
- Next to each team name in the bracket (once teams are populated from pool play).

**4. Score Entry Modal**
- Show rankings next to the team names at the top of the score entry form. Read-only context — just so the user sees who's ranked where while entering scores.

### How to fetch:
- Query `provincial_rankings` for each team, filtering by the most recent `date_recorded` for that team.
- Since we only have one entry per team right now, this is a simple join or lookup.
- Create a helper function like `getTeamRanking(teamId)` or batch-fetch all rankings for tournament teams in one query and pass them through as props/context.

### Visual treatment:
- Small text, slightly muted color (gray or the team's secondary color).
- Positioned right after or below the team name.
- For your team (Nepean Wildcats), the rank badge can use the same highlight treatment as the rest of the team highlighting.
- If a team has no ranking (shouldn't happen for this tournament, but handle defensively), show nothing — don't show "Unranked" or "N/A".

## What NOT to build
- No rankings entry form
- No historical trend chart
- No monthly reminders
- No rankings editing UI
- No CSV import for rankings

This is display-only using seeded data. The full rankings system comes in Phase 3.

## Acceptance Criteria
- [ ] All 11 teams have a provincial ranking in the database
- [ ] Rankings display next to team names on schedule game cards
- [ ] Rankings display in the pool standings table
- [ ] Rankings display in the bracket view
- [ ] Rankings display in the score entry modal
- [ ] Nepean Wildcats shows as #4
- [ ] Rankings are visually subtle (don't overwhelm the UI) but clearly readable
- [ ] App still looks good on mobile with the added rank info
