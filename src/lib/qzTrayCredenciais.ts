/**
 * Certificado autoassinado + chave privada usados só para o QZ Tray
 * conseguir reconhecer este PDV como uma identidade ESTÁVEL — é isso
 * que permite ao operador marcar "não perguntar novamente" e a
 * decisão realmente ser lembrada nas próximas vendas.
 *
 * IMPORTANTE — leia antes de mexer:
 * - Sem certificado, o QZ Tray não tem como diferenciar "esta aba
 *   específica" de "qualquer site sem certificado" — é exatamente por
 *   isso que "lembrar" parava de funcionar antes desta mudança.
 * - Este par foi gerado uma única vez (autoassinado, válido por 10
 *   anos) especificamente para este projeto. Não é de uma autoridade
 *   certificadora paga — não precisa ser, o QZ Tray só usa isso pra
 *   reconhecer a identidade do site, não pra validar contra terceiros.
 * - A chave privada fica no frontend (sem backend próprio neste
 *   projeto para assinar do lado do servidor) — aceitável para um PDV
 *   de caixa único, mas vale saber: tecnicamente, alguém com acesso ao
 *   código-fonte consegue extrair essa chave. Se um dia isso rodar em
 *   múltiplas lojas/caixas com exigência de segurança mais forte, o
 *   ideal é mover a assinatura para uma function no servidor.
 */

export const QZ_CERTIFICADO_PEM = `-----BEGIN CERTIFICATE-----
MIIDvzCCAqegAwIBAgIUUaTH6y5RZ2tS3lbQ7F+hX/1Aw6wwDQYJKoZIhvcNAQEL
BQAwbzELMAkGA1UEBhMCQlIxCzAJBgNVBAgMAlNQMQ8wDQYDVQQHDAZTdW1hcmUx
FzAVBgNVBAoMDkRvZ2FvIGRhIFByYWNhMQwwCgYDVQQLDANQRFYxGzAZBgNVBAMM
EkRvZ2FvIGRhIFByYWNhIFBEVjAeFw0yNjA5MDUyMjMxMDRaFw0zNjA5MDIyMjMx
MDRaMG8xCzAJBgNVBAYTAkJSMQswCQYDVQQIDAJTUDEPMA0GA1UEBwwGU3VtYXJl
MRcwFQYDVQQKDA5Eb2dhbyBkYSBQcmFjYTEMMAoGA1UECwwDUERWMRswGQYDVQQD
DBJEb2dhbyBkYSBQcmFjYSBQRFYwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQDchNsfFYomniXFAjIGaMJ9BQa3p0Pq3OTeySaHvbhE/1HA+OP9Se6GQLjh
sN9+5RV/fCuBz7SVGnr0IWQLlYWnHeodwrFdSn+RTO/G35t7oR13W3MrwJf44yLu
Sr/K4+g1+mboS6guwQQdjFdElM7/ryZKzduXCGw87cSdiaPZOCXhbvXkdzop4RT4
VpkRJXoQkQI9Z+uTHmSrPCyB0d0T4CPlRHk8H9Szdgj4z1ueO3kLk6cFHM47Ee2m
TWOVMJlWbNbePR/LEbfWKwEKsUMcVLvv5nrg4xH6cm0pgBC2cpevxM3KRV1kviJi
Pg2HjgyO+9rjJYiRdX+6P6wRMRCBAgMBAAGjUzBRMB0GA1UdDgQWBBRVHWwNA36C
gUDBiY/MWBs2yR2sfzAfBgNVHSMEGDAWgBRVHWwNA36CgUDBiY/MWBs2yR2sfzAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQC0vwrJ3dVkM3j5Q21O
tP46NftCIAXw4dcFqRInTWdV2keKNvYRkF/n5wybXTM9qYvrQM1voQIVA479pXpk
avJ7zi2KDRQ1fPWjZ1NzN876w8n3MgxFW6qD1TYuvPAMfwJqMhOGcuKleai8DYqr
w5LFoI4IjP2fyEWl60RSI828vpptRizLI6CUk7U8uGI3HAsZoD+2pBg1cEb6IsAZ
vQ1Qmj/nVHJPXPMsrxImdYj9sFSb0e/KSYep/hXFvtZ9YWLUiGnPWzJkDK1SznNu
ESmsw4bmbTJdSlFq0k+NYocJNGVJRWAXuYjpYf649PBGpIcnlQL8nHJ1k/xc9iAU
bWWy
-----END CERTIFICATE-----`;

export const QZ_CHAVE_PRIVADA_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDchNsfFYomniXF
AjIGaMJ9BQa3p0Pq3OTeySaHvbhE/1HA+OP9Se6GQLjhsN9+5RV/fCuBz7SVGnr0
IWQLlYWnHeodwrFdSn+RTO/G35t7oR13W3MrwJf44yLuSr/K4+g1+mboS6guwQQd
jFdElM7/ryZKzduXCGw87cSdiaPZOCXhbvXkdzop4RT4VpkRJXoQkQI9Z+uTHmSr
PCyB0d0T4CPlRHk8H9Szdgj4z1ueO3kLk6cFHM47Ee2mTWOVMJlWbNbePR/LEbfW
KwEKsUMcVLvv5nrg4xH6cm0pgBC2cpevxM3KRV1kviJiPg2HjgyO+9rjJYiRdX+6
P6wRMRCBAgMBAAECgf8avlIEtwwGGu/hsJ54gIP1vYJPC44FEbz/980gcTXDyGMV
0Bl2Ql0XEwpY9KZmMUomJ9zu5U21N3zp1pLXhM6sscgOy+nOspY9/OKnb77fg26b
Zw/UoorLuGAoHhCcfn9O7ItGaMaAxQ/GtZpvysw/3fH66HRVIMRfr0ZFBMhGM3te
W+zarjNB29ULHX0KeZEDeafC7skfIRHs8AxaZgW0w1rLYQZJgwImOVVaKS5Fq8RU
gMbQ5ke5ZG+ZE8LXHDAxT4/JiHliNMHKTbjq/8hJ35a6qelaa6f6x+d2mPgESItP
Wru1TkqVo8wpctlj8IYX8ULguUSoYZI6e9HYBcECgYEA88k3xhA3hoQ19auDlI87
JCumG6QSQBXx26QrCtbrilL2yR+QrQ/DrGxG6c1qRctf+1Qh83UyL2tRFNqkHtXR
RW8M/AOGkjw60QIvE4PodoqWe5WAnu60n9sPO9miMjG7WT5NsPtdR/1MCrxa1jcx
WGA/hl7d12YUJX4YlvLOhcECgYEA55E3eEfYsr5ORA17yiUygD+Iflm8WgCEf0zV
TzJ9MEOluqsJ76aVwjL5Jwt9jOgMxXhoMHsCb2jvlTxqJA8nb0xDFrp+zR4JqesP
yzuFT6woptXNs5v06DAj3HTUQEQFdhqxHpxWgDZpJQHHz6OHio2Ur6txIhtVKF+E
WapQusECgYEAkjQzBs3i/wF7ewKJvybHSUIENL+JUnXWvusOBUovqJ1o8+XCVogF
yfqF7OIMwh7eSVSDqAa5OkcaMW+Ozg9dmk6nctyKcFk+zOqKYSHS4ITtCuD2alqu
aNBvqm0zIPdCbJs47NNTdkEqwaWEtMQVC/NtJaDvWqcVngapqJ2lzgECgYEAiNK5
5rz04jAlyHn7EabG3xYrDRTygG9b2mfIhcH8TD88Nj6HYW2ZgSRjKNnWNiKKIUeS
sEqOVsu2/AO1Z1b44v85iL1q3MGJzjdQnrGthDTh1CnyH9TfcS24krMJEmvemjkN
PFv9lEYR/EbADATAunILT3zKHO/vcip15hEHIEECgYBmvc+x1OgY1rnvNL85lFIO
h0zsQ6/ibSzapL/Djt10JMH0WKYjdAKpJr997ctRBLFdUphQnMVWHNGeLqLN7BV3
VBMI8XFF9jOCfK+U/t+X3s5uqnh6nznBsWWj1eQRpZ2rOz7aE2ChdUEF8874PNxY
K1f4na/N+QwkfzHl+nMHmg==
-----END PRIVATE KEY-----`;
