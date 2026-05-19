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

export const expenseApi = createApi({
  reducerPath: 'expenseApi',
  baseQuery: base,
  tagTypes: ['Expenses'],
  endpoints: (b) => ({
    listExpenses: b.query<any, Record<string, string>>({
      query: (params) => ({ url: '/expenses', params }),
      providesTags: ['Expenses'],
    }),
    getExpense: b.query<any, string>({
      query: (id) => `/expenses/${id}`,
    }),
    createExpense: b.mutation<any, FormData>({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      invalidatesTags: ['Expenses'],
    }),
    updateExpense: b.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/expenses/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Expenses'],
    }),
    deleteExpense: b.mutation<any, string>({
      query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Expenses'],
    }),
  }),
});

export const { useListExpensesQuery, useGetExpenseQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } = expenseApi;
