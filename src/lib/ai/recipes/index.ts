import type { Recipe } from '../types';
import { anthropic } from './anthropic';
import { openai } from './openai';
import { google } from './google';
import { ollama } from './ollama';

const ALL: Recipe[] = [anthropic, openai, google, ollama];

export const RECIPES: Map<string, Recipe> = new Map(ALL.map(r => [r.id, r]));

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.get(id);
}

export function listRecipes(): Recipe[] {
  return [...ALL];
}
