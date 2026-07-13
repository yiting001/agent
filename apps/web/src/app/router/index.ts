import { createRouter, createWebHistory } from 'vue-router';

import { homeRoute } from './home.route';
import { knowledgeRoute } from './knowledge.route';

/** Application router assembled from feature-owned route records. */
export const router = createRouter({
  history: createWebHistory(),
  routes: [homeRoute, knowledgeRoute],
});
