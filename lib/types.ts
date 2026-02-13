export type GameStatus = "scheduled" | "in_progress" | "completed"

export type GameStage =
  | "pool_play"
  | "quarterfinal"
  | "semifinal"
  | "final"
  | "consolation"
  | "regular_season"
  | "playoff"

export interface Team {
  id: string
  name: string
  external_id: string | null
  level: string | null
  skill_level: string | null
  division: string | null
}

export interface Pool {
  id: string
  tournament_id: string
  name: string
  advancement_count: number
}

export interface Game {
  id: string
  tournament_id: string | null
  pool_id: string | null
  season_id: string | null
  game_number: string | null
  stage: GameStage
  start_datetime: string
  venue: string | null
  home_team_id: string | null
  away_team_id: string | null
  home_placeholder: string | null
  away_placeholder: string | null
  bracket_source_game_1_id: string | null
  bracket_source_game_2_id: string | null
  final_score_home: number | null
  final_score_away: number | null
  goals_by_period_home: number[] | null
  goals_by_period_away: number[] | null
  penalty_minutes_home: number | null
  penalty_minutes_away: number | null
  fastest_goal_seconds_home: number | null
  fastest_goal_seconds_away: number | null
  result_type: string | null
  end_reason: string | null
  overtime_winner_team_id: string | null
  shootout_winner_team_id: string | null
  status: GameStatus
  entered_by: string | null
  home_team: Team | null
  away_team: Team | null
  pool: Pool | null
}

export interface TiebreakerRule {
  id: string
  tournament_id: string
  priority_order: number
  rule_type: "simple" | "formula"
  simple_stat: string | null
  simple_direction: string | null
  formula_expression: string | null
  formula_precision: number | null
  formula_direction: string | null
  head_to_head_max_teams: number | null
  description: string | null
}

export type RankingsMap = Record<string, number>

export interface PointStructure {
  win_points: number
  tie_points: number
  loss_points: number
  otl_points: number
}
