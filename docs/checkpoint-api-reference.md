# Referência de APIs Check Point

Link oficial informado para uso nos próximos botões do NetGuardian:

- https://sc1.checkpoint.com/documents/latest/APIs/index.html#introduction~v2.1%20

## Observações

A página é a referência oficial de APIs da Check Point e centraliza links para:

- Management API
- GAiA API
- Threat Prevention API
- Identity Awareness API
- Spark Management API
- Harmony Connect API
- CloudGuard API
- Cloud Management Extension API
- Smart-1 Cloud API
- Infinity Portal API
- Zero Touch API
- Harmony Endpoint Management API
- Infinity XDR/XPR API
- Infinity Events API
- CloudGuard AppSec API
- Infinity Playblocks

## Uso no projeto

O primeiro botão, **Verificar Saúde do Ambiente**, continua usando SSH com `node-ssh` para executar comandos diretamente no firewall.

Para próximos botões, avaliar primeiro se a ação deve usar:

1. **SSH/GAiA CLI**: melhor para comandos operacionais locais do gateway, coletas de saúde, logs locais, interfaces, CoreXL, SecureXL e disco.
2. **Management API**: melhor para objetos, políticas, regras, gateways gerenciados, sessões de mudança e consultas ao Management Server.
3. **GAiA API**: melhor para automações de configuração e consultas do sistema operacional GAiA quando disponível.
4. **Threat Prevention / Identity / Infinity APIs**: melhor para recursos específicos desses domínios.

Antes de implementar novos botões, consultar essa referência para escolher a API correta e evitar depender de parsing de comandos quando existir endpoint estruturado.
