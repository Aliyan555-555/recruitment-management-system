export interface BehaviorDefinition {
  name: string
  positiveIndicators: string[]
  negativeIndicators: string[]
}

export const INTERNAL_BEHAVIORS: BehaviorDefinition[] = [
  {
    name: "Delivers Quality",
    positiveIndicators: [
      "Considers the structure of the meeting beforehand and has prepared and offers information without much need of prompting",
      "Demonstrates a conscientious approach. Has thought about the issues from meeting with Ali with an informed view of situation and how to move this forward",
      "Suggestions made show an appreciation of the need for a fast response, for agreed milestones, for delivery targets or for monitoring of the service, etc.",
      "Suggestions made show that a level of personal responsibility for that excellent customer service is taken",
      "Understands the detail in the customer satisfaction survey and outlines clear expectations as to how the team could improve"
    ],
    negativeIndicators: [
      "Unstructured in their approach to the meeting, little evidence of having ordered their thoughts in preparation for the meeting",
      "Fails to demonstrate that they have spent time thinking about the issues for Ali or what they can do to deliver results",
      "Suggestions made make no reference to speed of delivery or response, or to targets or milestones",
      "No evidence of having thought about personal involvement in delivering excellent customer service",
      "Fails to pick up on any of the detail provided in the brief (e.g. within the customer satisfaction survey)"
    ]
  },
  {
    name: "Strives for Continual Improvement",
    positiveIndicators: [
      "Actively seeks feedback and incorporates it into their work approach",
      "Identifies areas for improvement and proposes concrete solutions",
      "Shows willingness to learn from mistakes and adapt strategies",
      "Demonstrates commitment to enhancing processes and outcomes",
      "Takes initiative to suggest improvements without being prompted"
    ],
    negativeIndicators: [
      "Shows resistance to feedback or dismisses suggestions for improvement",
      "Fails to recognize areas where performance could be enhanced",
      "Repeats the same mistakes without learning or adapting",
      "Lacks initiative in identifying or addressing improvement opportunities",
      "Shows complacency and unwillingness to change current approaches"
    ]
  },
  {
    name: "Makes an Impact",
    positiveIndicators: [
      "Takes decisive action that leads to measurable positive outcomes",
      "Influences others effectively through clear communication and leadership",
      "Delivers results that exceed expectations and create value",
      "Demonstrates ability to drive change and achieve strategic objectives",
      "Shows strong presence and contributes significantly to group discussions"
    ],
    negativeIndicators: [
      "Actions have minimal or no observable impact on outcomes",
      "Struggles to influence others or gain buy-in for ideas",
      "Fails to deliver results that meet basic expectations",
      "Shows passive participation with little contribution to group dynamics",
      "Unable to translate ideas into actionable plans or results"
    ]
  },
  {
    name: "Demonstrates Innovation and Curiosity",
    positiveIndicators: [
      "Asks insightful questions that challenge assumptions and explore new possibilities",
      "Proposes creative solutions that go beyond conventional approaches",
      "Shows genuine interest in learning and understanding complex problems",
      "Brings fresh perspectives and innovative ideas to discussions",
      "Demonstrates willingness to experiment and take calculated risks"
    ],
    negativeIndicators: [
      "Shows limited curiosity and asks few or no probing questions",
      "Relies solely on conventional approaches without exploring alternatives",
      "Demonstrates disinterest in understanding underlying causes or deeper issues",
      "Brings no new ideas or perspectives to the discussion",
      "Avoids taking risks or trying new approaches even when appropriate"
    ]
  }
]

export const EXTERNAL_BEHAVIORS: BehaviorDefinition[] = [
  {
    name: "Drives Collaboration and Inclusion",
    positiveIndicators: [
      "Actively encourages participation from all group members and ensures everyone's voice is heard",
      "Builds consensus by finding common ground and integrating diverse perspectives",
      "Creates an inclusive environment where all team members feel valued and respected",
      "Facilitates effective teamwork by managing group dynamics and resolving conflicts",
      "Demonstrates strong interpersonal skills and ability to work harmoniously with others"
    ],
    negativeIndicators: [
      "Dominates discussions and fails to include others in decision-making",
      "Shows disregard for different viewpoints and dismisses alternative perspectives",
      "Creates an exclusive environment that marginalizes certain group members",
      "Struggles to work collaboratively and often works in isolation",
      "Demonstrates poor interpersonal skills and inability to build rapport with others"
    ]
  },
  {
    name: "Strives for Continual Improvement",
    positiveIndicators: [
      "Actively seeks feedback from external stakeholders and incorporates it into their approach",
      "Identifies areas for improvement and proposes concrete solutions",
      "Shows willingness to learn from mistakes and adapt strategies",
      "Demonstrates commitment to enhancing processes and outcomes",
      "Takes initiative to suggest improvements without being prompted"
    ],
    negativeIndicators: [
      "Shows resistance to feedback or dismisses suggestions for improvement",
      "Fails to recognize areas where performance could be enhanced",
      "Repeats the same mistakes without learning or adapting",
      "Lacks initiative in identifying or addressing improvement opportunities",
      "Shows complacency and unwillingness to change current approaches"
    ]
  },
  {
    name: "Makes an Impact",
    positiveIndicators: [
      "Takes decisive action that leads to measurable positive outcomes",
      "Influences others effectively through clear communication and leadership",
      "Delivers results that exceed expectations and create value",
      "Demonstrates ability to drive change and achieve strategic objectives",
      "Shows strong presence and contributes significantly to group discussions"
    ],
    negativeIndicators: [
      "Actions have minimal or no observable impact on outcomes",
      "Struggles to influence others or gain buy-in for ideas",
      "Fails to deliver results that meet basic expectations",
      "Shows passive participation with little contribution to group dynamics",
      "Unable to translate ideas into actionable plans or results"
    ]
  },
  {
    name: "Resilience",
    positiveIndicators: [
      "Maintains composure and effectiveness under pressure or in challenging situations",
      "Bounces back quickly from setbacks and learns from failures",
      "Demonstrates emotional stability and ability to handle stress constructively",
      "Shows persistence and determination when facing obstacles",
      "Adapts effectively to changing circumstances and remains focused on goals"
    ],
    negativeIndicators: [
      "Becomes easily overwhelmed or loses effectiveness under pressure",
      "Struggles to recover from setbacks and dwells on failures",
      "Shows emotional volatility and inability to manage stress effectively",
      "Gives up easily when facing obstacles or challenges",
      "Fails to adapt to changing circumstances and becomes rigid in approach"
    ]
  }
]

export const RATING_SCALE = [
  {
    rating: 4,
    description: 'Excellent evidence of competence (majority of "effective" indicators are met and no "less effective" indicators are displayed)'
  },
  {
    rating: 3,
    description: 'Strong evidence of competence (more "effective" than "less effective" indicators are met)'
  },
  {
    rating: 2,
    description: 'Some development required ("effective" behaviours are weak or outweighed by "less effective" behaviours)'
  },
  {
    rating: 1,
    description: 'Significant development required (majority of evidence is "less effective")'
  }
]

