
// src/ai/flows/suggest-seat-arrangements.ts
'use server';

/**
 * @fileOverview AI-powered seat arrangement suggestion flow.
 *
 * - suggestSeatArrangements - A function that suggests seat arrangements based on fairness and past override requests.
 * - SuggestSeatArrangementsInput - The input type for the suggestSeatArrangements function.
 * - SuggestSeatArrangementsOutput - The return type for the suggestSeatArrangements function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSeatArrangementsInputSchema = z.object({
  employees: z
    .array(z.string())
    .describe('A list of employee names to be seated.'),
  seats: z.array(z.string()).describe('A list of available seat names.'),
  pastOverrideRequests: z
    .record(z.array(z.string()))
    .describe(
      'A record of past approved seat override requests, where keys are employee names and values are lists of requested seats. This can be used as a signal for user preference.'
    ),
  fairnessMetric: z
    .string()
    .describe(
      'The metric to use for fairness, e.g., equal time in preferred seats.'
    ),
  lockedSeats: z
    .record(z.string())
    .optional()
    .describe(
      'A record of users whose seats are locked for the day, where keys are employee names and values are their locked seat names. These users should not be moved.'
    ),
});
export type SuggestSeatArrangementsInput = z.infer<
  typeof SuggestSeatArrangementsInputSchema
>;

const SuggestSeatArrangementsOutputSchema = z.record(z.string()).describe(
  'A seat arrangement suggestion, where keys are employee names and values are assigned seat names.'
);
export type SuggestSeatArrangementsOutput = z.infer<
  typeof SuggestSeatArrangementsOutputSchema
>;

export async function suggestSeatArrangements(
  input: SuggestSeatArrangementsInput
): Promise<SuggestSeatArrangementsOutput> {
  return suggestSeatArrangementsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSeatArrangementsPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: {schema: SuggestSeatArrangementsInputSchema},
  output: {schema: SuggestSeatArrangementsOutputSchema},
  prompt: `You are an AI assistant that suggests seat arrangements for employees, taking into account fairness, locked seats, and past seat override requests.

Given the following information, create a seat arrangement that is as fair as possible, considering the past override requests of each employee as a strong indicator of their preferences.

Employees: {{employees}}
Seats: {{seats}}
Past Approved Override Requests (as preferences): {{json pastOverrideRequests}}
Locked Seats (these assignments MUST NOT change): {{json lockedSeats}}
Fairness Metric: "{{fairnessMetric}}"

Output a JSON object where the keys are employee names and the values are the assigned seat names.

Ensure every employee has an assigned seat and every seat has one employee assigned to it. The users with locked seats must remain in their specified seats. The remaining users should be assigned to the remaining available seats based on the fairness metric and their preferences.
`,
});

const suggestSeatArrangementsFlow = ai.defineFlow(
  {
    name: 'suggestSeatArrangementsFlow',
    inputSchema: SuggestSeatArrangementsInputSchema,
    outputSchema: SuggestSeatArrangementsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
