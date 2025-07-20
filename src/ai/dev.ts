import { config } from 'dotenv';
config();

import {googleAI} from '@genkit-ai/googleai';
import {genkit} from 'genkit';

export default genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
