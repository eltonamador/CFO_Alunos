import {expect,it} from 'vitest';
import {canManageInternship,isInternshipManagementPath} from './access';
it('aceita coordenador ativo e cadete com delegação verificada',()=>{
 expect(canManageInternship({role:'coordenacao',active:true})).toBe(true);
 expect(canManageInternship({role:'aluno',active:true,canManageInternship:true})).toBe(true);
});
it.each([null,{role:'aluno',active:true},{role:'aluno',active:false,canManageInternship:true},{role:'coordenacao',active:false},{role:'secretaria',active:true,canManageInternship:true},{role:'instrutor',active:true,canManageInternship:true}])('nega acesso sem permissão ativa: %j',profile=>expect(canManageInternship(profile)).toBe(false));
it('exceção de rota fica restrita ao estágio',()=>{
 expect(isInternshipManagementPath('/coordenacao/estagio')).toBe(true);
 expect(isInternshipManagementPath('/coordenacao/estagio/semana')).toBe(true);
 for(const path of ['/coordenacao','/coordenacao/alunos','/coordenacao/relatorios','/coordenacao/estagio-extra','/api/reports/saude'])expect(isInternshipManagementPath(path)).toBe(false);
});
