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

export const payrollApi = createApi({
  reducerPath: 'payrollApi',
  baseQuery: base,
  tagTypes: ['Payroll'],
  endpoints: (b) => ({
    listPayrolls: b.query<any, Record<string, string>>({
      query: (params) => ({ url: '/payroll', params }),
      providesTags: ['Payroll'],
    }),
    processPayroll: b.mutation<any, { month: string }>({
      query: (body) => ({ url: '/payroll/process', method: 'POST', body }),
      invalidatesTags: ['Payroll'],
    }),
    updateStatus: b.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/payroll/${id}/status`, method: 'PUT', body: { status } }),
      invalidatesTags: ['Payroll'],
    }),
  }),
});

export const { useListPayrollsQuery, useProcessPayrollMutation, useUpdateStatusMutation } = payrollApi;
