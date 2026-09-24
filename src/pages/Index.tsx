import { useSeoMeta } from '@unhead/react';
import TeamWorkspace from '@/components/rest/TeamWorkspace';
import '@/components/rest/team-workspace.css';

const Index = () => {
  useSeoMeta({
    title: 'Restivism — our shared practice of rest',
    description: 'A team covenant, a shared rest rota, and explicit handovers. Make rest part of how your movement works.',
  });

  return <TeamWorkspace />;
};

export default Index;
