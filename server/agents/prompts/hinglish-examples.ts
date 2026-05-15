// Synthetic few-shot examples covering common Hinglish patterns in Crownstack standups.
// Replace these with real anonymized Crownstack standup snippets once available.

export const HINGLISH_FEW_SHOT_EXAMPLES = [
  {
    hinglish: 'ho jayega aaj',
    english: 'it will be done today',
    commitmentConfidence: 'vague' as const,
    note: 'Vague positive commitment; does not confirm completion — flag as aspirational',
  },
  {
    hinglish: 'try karta hu',
    english: 'I will try',
    commitmentConfidence: 'aspirational' as const,
    note: 'Soft commitment — not a firm deadline',
  },
  {
    hinglish: 'dekhta hu',
    english: 'I will see / will look into it',
    commitmentConfidence: 'vague' as const,
    note: 'Non-committal; flag as vague',
  },
  {
    hinglish: 'kal tak complete kar deta hu',
    english: 'I will complete it by tomorrow',
    commitmentConfidence: 'firm' as const,
    note: '"kal" in future tense = tomorrow; explicit completion commitment',
  },
  {
    hinglish: 'kal kar liya tha',
    english: 'completed it yesterday',
    commitmentConfidence: 'firm' as const,
    note: '"kal" in past tense = yesterday; marks task as completed',
  },
  {
    hinglish: 'parso tak deta hu',
    english: 'will give by day after tomorrow',
    commitmentConfidence: 'firm' as const,
    note: '"parso" in future tense = day after tomorrow',
  },
  {
    hinglish: 'do din aur chahiye',
    english: 'need 2 more days',
    commitmentConfidence: 'vague' as const,
    note: 'Extend deadline by 2 days from today; increment slippage count',
  },
  {
    hinglish: 'char ghante ka kaam hai',
    english: 'it is 4 hours of work',
    commitmentConfidence: 'firm' as const,
    note: 'Explicit hour estimate from developer — store as resource_estimated_hours',
  },
  {
    hinglish: 'mai API integration kar raha hu, but Postman me kuch issue aa raha hai',
    english:
      'I am working on API integration, but there is some issue in Postman (blocker — external tool issue)',
    commitmentConfidence: 'vague' as const,
    note: 'Blocker detected; risk category = blocker_unresolved',
  },
  {
    hinglish: 'atka hua hai',
    english: 'stuck / blocked',
    commitmentConfidence: 'vague' as const,
    note: 'Explicit blocker signal',
  },
  {
    hinglish: 'client ne escalate kar diya',
    english: 'client has escalated',
    commitmentConfidence: 'firm' as const,
    note: 'Risk event; severity = high or critical',
  },
  {
    hinglish: 'nahi ho paya kal',
    english: 'could not complete it yesterday',
    commitmentConfidence: 'vague' as const,
    note: 'Missed commitment from previous day; flag as missed_deadline risk candidate',
  },
  {
    hinglish: 'almost done hai, bas testing baki hai',
    english: 'almost done, only testing is remaining',
    commitmentConfidence: 'vague' as const,
    note: 'Qualifier "almost" — treat as in_progress, not completed',
  },
  {
    hinglish: 'end of day tak de dunga',
    english: 'will deliver by end of day',
    commitmentConfidence: 'firm' as const,
    note: 'EOD commitment; resolve deadline = standup_date',
  },
]

export const HINGLISH_TIME_WORDS = {
  kal: 'yesterday (past tense) / tomorrow (future tense)',
  parso: 'day before yesterday (past tense) / day after tomorrow (future tense)',
  'do din': '2 days',
  'teen din': '3 days',
  'char din': '4 days',
  'ek hafte': '1 week',
  'do hafte': '2 weeks',
  'char ghante': '4 hours',
  'do ghante': '2 hours',
  'aaj': 'today',
  'abhi': 'right now / immediately',
  'jaldi': 'soon / quickly',
  'thodi der me': 'in a little while',
  'week end tak': 'by end of week',
  'end of day': 'end of current working day',
  eod: 'end of day',
  eow: 'end of week',
}
