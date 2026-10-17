// Explicitly release only personal training fields; new database columns stay private.
const fields = {
  profiles: 'id player_profile_id user_id active pilot_started_on pilot_target_units account_name',
  sessions: 'id individual_profile_id scheduled_for timezone duration_minutes unit_number status cancellation_kind attendance_status',
  plans: 'id individual_profile_id session_id title objective version',
  exercises: 'id individual_profile_id session_id plan_id position title duration_minutes repetitions measurement_method coaching_cues',
  measurements: 'id individual_profile_id session_id exercise_id metric_key numeric_value text_value unit attempt server_received_at',
  readiness: 'id individual_profile_id session_id score server_received_at',
  focuses: 'id individual_profile_id source_session_id title cue_one cue_two success_indicator valid_from valid_until',
  feedback: 'id individual_profile_id focus_id training_day training_date occurrence implementation_score note server_received_at',
  releasedFeedback: 'id individual_profile_id session_id content released_at',
  notifications: 'id individual_profile_id kind due_at read_at stopped_at payload'
};

function pick(row, names) {
  return Object.fromEntries(names.split(' ').filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]]));
}

export function individualPlayerData(payload) {
  const result = { role: 'player', pilotRoadmap: payload.pilotRoadmap };
  for (const [collection, names] of Object.entries(fields)) {
    const rows = (payload[collection] || []).filter(row => collection !== 'measurements' || row.metric_key !== 'trainernotiz');
    result[collection] = rows.map(row => {
      const released = pick(row, names);
      if (collection === 'notifications' && released.payload) {
        released.payload = pick(released.payload, 'sessionId scheduledFor focusId trainingDate trainingDay title cueOne cueTwo');
      }
      return released;
    });
  }
  return result;
}
