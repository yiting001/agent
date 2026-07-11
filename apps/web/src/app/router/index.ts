import { createRouter, createWebHistory } from 'vue-router';

import { homeRoute } from './home.route';
import { richContentRoute } from './rich-content.route';

/** Application router assembled from feature-owned route records. */
export const router = createRouter({
  history: createWebHistory(),
  routes: [homeRoute, richContentRoute],
});
