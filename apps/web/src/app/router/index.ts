import { createRouter, createWebHistory } from 'vue-router';

import { adminRoute } from './admin.route';
import { chatRoute } from './chat.route';

/** Application router assembled from feature-owned route records. */
export const router = createRouter({
  history: createWebHistory(),
  routes: [adminRoute, chatRoute],
});
