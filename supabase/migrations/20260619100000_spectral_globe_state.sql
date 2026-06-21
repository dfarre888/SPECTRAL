-- spectral_globe_state view for PCM Cesium bridge
CREATE OR REPLACE VIEW spectral_globe_state AS
SELECT
  e.id AS exercise_id,
  e.status,
  tr.turn,
  tr.world_state_snapshot AS world_state,
  tr.blue_sensor_picture AS sensor_picture,
  tr.adjudication_result,
  tr.timestamp AS turn_at
FROM spectral_exercises e
LEFT JOIN LATERAL (
  SELECT * FROM spectral_turn_records
  WHERE exercise_id = e.id
  ORDER BY turn DESC
  LIMIT 1
) tr ON true;
