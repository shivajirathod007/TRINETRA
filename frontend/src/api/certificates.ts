import { useQuery } from '@tanstack/react-query';
import api from './client';
import { PQCCertificate } from '@/types';

export const useCertificates = (params?: { scanId?: string; domain?: string }) => {
  return useQuery<PQCCertificate[]>({
    queryKey: ['certificates', params],
    queryFn: async () => {
      const { data } = await api.get('/certificates', { params });
      return data;
    },
    enabled: !!(params?.scanId || params?.domain),
  });
};

export const useCertificate = (certId: string) => {
  return useQuery<PQCCertificate>({
    queryKey: ['certificate', certId],
    queryFn: async () => {
      const { data } = await api.get(`/certificates/${certId}`);
      return data;
    },
    enabled: !!certId,
  });
};
