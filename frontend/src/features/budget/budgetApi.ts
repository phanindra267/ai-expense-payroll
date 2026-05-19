import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../app/store';

const base = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (h, { getState }) => {
    const t = (getState() as RootState).auth.accessToken;
    if (t) h.set('authorization', `Bearer ${t}`);
    return h;
  },
});

export const budgetApi = createApi({
  reducerPath: 'budgetApi',
  baseQuery: base,
  tagTypes: ['Budgets'],
  endpoints: (b) => ({
    listBudgets: b.query<any, Record<string, string>>({
      query: (params) => ({ url: '/budgets', params }),
      providesTags: ['Budgets'],
    }),
    setBudget: b.mutation<any, any>({
      query: (body) => ({ url: '/budgets', method: 'POST', body }),
      invalidatesTags: ['Budgets'],
    }),
    deleteBudget: b.mutation<any, string>({
      query: (id) => ({ url: `/budgets/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Budgets'],
    }),
  }),
});

export const { useListBudgetsQuery, useSetBudgetMutation, useDeleteBudgetMutation } = budgetApi;
