'use server';
/**
 * @fileOverview AI flow to alert the user on the status of their seat change request.
 *
 * - alertSeatChangeStatus - A function that handles the alert process.
 * - AlertSeatChangeStatusInput - The input type for the alertSeatChangeStatus function.
 * - AlertSeatChangeStatusOutput - The return type for the alertSeatChangeStatus function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AlertSeatChangeStatusInputSchema = z.object({
  isApproved: z.boolean().describe('Whether the seat change request was approved or not.'),
  approvalsNeeded: z.number().describe('The number of approvals needed for the seat change request.'),
  approvalsReceived: z.number().describe('The number of approvals received for the seat change request.'),
  proposedSeat: z.string().describe('The seat the user requested to change to.'),
  currentSeat: z.string().describe('The user\'s current seat.'),
});
export type AlertSeatChangeStatusInput = z.infer<typeof AlertSeatChangeStatusInputSchema>;

const AlertSeatChangeStatusOutputSchema = z.object({
  alertMessage: z.string().describe('The message to display to the user about the status of their seat change request.'),
});
export type AlertSeatChangeStatusOutput = z.infer<typeof AlertSeatChangeStatusOutputSchema>;

export async function alertSeatChangeStatus(input: AlertSeatChangeStatusInput): Promise<AlertSeatChangeStatusOutput> {
  return alertSeatChangeStatusFlow(input);
}

const prompt = ai.definePrompt({
  name: 'alertSeatChangeStatusPrompt',
  input: {schema: AlertSeatChangeStatusInputSchema},
  output: {schema: AlertSeatChangeStatusOutputSchema},
  prompt: `You are an AI assistant that alerts the user on the status of their seat change request.

The user has requested to change from seat {{{currentSeat}}} to seat {{{proposedSeat}}}.

The seat change request requires {{{approvalsNeeded}}} approvals and has received {{{approvalsReceived}}} approvals.

Based on this information, determine if the seat change request has been approved or not. The isApproved parameter is {{{isApproved}}}.

Generate a message to display to the user about the status of their seat change request. The message should clearly state whether or not the request was approved.
`,
});

const alertSeatChangeStatusFlow = ai.defineFlow(
  {
    name: 'alertSeatChangeStatusFlow',
    inputSchema: AlertSeatChangeStatusInputSchema,
    outputSchema: AlertSeatChangeStatusOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
