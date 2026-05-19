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

export const employeeApi = createApi({
  reducerPath: 'employeeApi',
  baseQuery: base,
  tagTypes: ['Employees'],
  endpoints: (b) => ({
    listEmployees: b.query<any, Record<string, string>>({
      query: (params) => ({ url: '/employees', params }),
      providesTags: ['Employees'],
    }),
    getEmployee: b.query<any, string>({
      query: (id) => `/employees/${id}`,
      providesTags: ['Employees'],
    }),
    createEmployee: b.mutation<any, any>({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: ['Employees'],
    }),
    updateEmployee: b.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/employees/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Employees'],
    }),
    deleteEmployee: b.mutation<any, string>({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Employees'],
    }),
    addAdjustment: b.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/employees/${id}/adjustments`, method: 'POST', body: data }),
      invalidatesTags: ['Employees'],
    }),
  }),
});

export const { useListEmployeesQuery, useGetEmployeeQuery, useCreateEmployeeMutation, useUpdateEmployeeMutation, useDeleteEmployeeMutation, useAddAdjustmentMutation } = employeeApi;
