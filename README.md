# Calculadora de Emissão de Carbono

Aplicação web estática que estima e compara as emissões de CO₂ equivalente (CO₂e) de uma viagem de bicicleta, carro, ônibus ou caminhão. A distância pode vir de uma base simulada de rotas brasileiras ou ser informada manualmente.

> **Aviso:** rotas, fatores e valores são parâmetros ilustrativos para fins educacionais. Os resultados não são medições oficiais, cotação de créditos nem certificação de neutralização.

## Objetivo

Demonstrar como organizar uma aplicação com HTML, CSS e JavaScript puro para calcular emissões estimadas, comparar meios de transporte e apresentar uma simulação matemática de compensação.

## Funcionalidades

- Autocompletar cidades com busca sem distinção entre maiúsculas/minúsculas ou acentos.
- Preenchimento automático de distâncias cadastradas, inclusive para rotas inversas.
- Distância manual para rotas fora da base simulada.
- Cálculo de emissões para os quatro meios de transporte.
- Comparação visual com barras proporcionais, indicação do meio selecionado, menor emissão e maior emissão.
- Estimativa de créditos de carbono e custo em reais para o transporte selecionado.
- Validação de origem, destino, distância e meio de transporte.
- Layout responsivo e controles acessíveis por teclado.
- Botão para iniciar uma nova simulação.

## Tecnologias

- HTML5
- CSS3
- JavaScript moderno com ES Modules

Não são usados frameworks, bibliotecas externas, serviços de mapas ou dependências de build.

## Estrutura do projeto

```text
.
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── calculator.js
│   ├── config.js
│   ├── routes.js
│   └── ui.js
└── .github/
    └── workflows/
        └── deploy.yml
```

### Responsabilidades dos módulos

- `index.html`: estrutura semântica, formulário e áreas de resultado.
- `css/style.css`: identidade visual, componentes e regras responsivas.
- `js/routes.js`: dados simulados de rotas entre cidades.
- `js/config.js`: fatores, preço de crédito, unidades e precisão de apresentação.
- `js/calculator.js`: consulta de distância e regras de cálculo, sem acesso ao DOM.
- `js/ui.js`: autocompletar, apresentação de resultados, mensagens e reset.
- `js/app.js`: inicialização, eventos, validação e integração dos módulos.
- `.github/workflows/deploy.yml`: publica os arquivos estáticos no GitHub Pages.

## Como executar localmente

Os arquivos JavaScript usam módulos ES. Por isso, abra a aplicação por um servidor HTTP local, não diretamente pelo endereço `file://`.

1. Abra um terminal na pasta do projeto.
2. Inicie o servidor estático integrado ao Python:

   ```bash
   python -m http.server 8000
   ```

3. Acesse <http://localhost:8000> no navegador.
4. Para encerrar, pressione `Ctrl+C` no terminal.

Não é necessário instalar pacotes ou compilar o projeto.

## Como utilizar

1. Digite e selecione uma cidade de origem e uma de destino.
2. Se a rota estiver na base, a distância será preenchida automaticamente. Caso contrário, informe a distância em quilômetros.
3. Selecione o meio de transporte utilizado.
4. Clique em **Calcular emissão** para ver o resultado, a comparação e a compensação estimada.
5. Use **Nova simulação** para limpar os campos e começar novamente.

## Fatores e fórmula de emissão

Os fatores estão centralizados em `js/config.js` e são expressos em kg CO₂e por quilômetro da viagem modelada:

| Transporte | Fator ilustrativo |
|---|---:|
| Bicicleta | 0 kg CO₂e/km |
| Carro | 0,192 kg CO₂e/km |
| Ônibus | 0,089 kg CO₂e/km |
| Caminhão | 0,75 kg CO₂e/km |

Para cada opção, a aplicação calcula:

```text
Emissão (kg CO₂e) = distância (km) × fator de emissão (kg CO₂e/km)
```

A comparação usa a mesma distância para todos os meios. O percentual de cada meio é calculado em relação à emissão mais alta; quando todas as emissões são zero, os percentuais também são apresentados como zero.

Os fatores são fixos e didáticos. O modelo não considera ocupação do veículo, carga, combustível, condições de tráfego nem outros fatores específicos da viagem; portanto, não representam uma média oficial universal.

## Créditos de carbono

Na simulação, um crédito corresponde a uma tonelada de CO₂e, ou 1.000 kg. O preço configurado é de R$ 50,00 por crédito e pode ser alterado em `js/config.js`.

```text
Emissão (t CO₂e) = emissão (kg CO₂e) ÷ 1.000
Créditos necessários = emissão (t CO₂e)
Custo estimado = créditos necessários × preço por crédito
```

### Exemplo

Para uma viagem de 100 km de carro:

- Emissão: `100 × 0,192 = 19,2 kg CO₂e`.
- Emissão em toneladas: `19,2 ÷ 1.000 = 0,0192 t CO₂e`.
- Créditos estimados: `0,0192`.
- Custo estimado: `0,0192 × R$ 50,00 = R$ 0,96`.

Os resultados são uma estimativa matemática. A aplicação não comercializa nem compra créditos e não certifica neutralização de carbono. A compensação efetiva depende da aquisição de créditos válidos e certificados.

## Base de rotas e limitações

`js/routes.js` contém uma amostra pequena de rotas para demonstrar a consulta de distância e o autocompletar. As distâncias são simuladas e podem não corresponder a percursos reais ou a medições atuais. Rotas não cadastradas exigem a entrada manual da distância.

A aplicação não consulta mapas, não calcula itinerários e não armazena dados do usuário. Os resultados servem apenas para comparação dentro do modelo simplificado descrito acima.

## Demonstração

Uma captura de tela de uma simulação será adicionada a esta seção quando a imagem for criada e incluída no repositório.

## Ordem de desenvolvimento

1. Estrutura HTML — concluída.
2. Estilos responsivos — concluída.
3. Base simulada e configurações — concluída.
4. Funções de cálculo — concluída.
5. Interface e renderização — concluída.
6. Integração e validações — concluída.
7. Documentação — concluída.
8. Workflow para publicação no GitHub Pages — concluído; publicação no repositório remoto pendente.

## Exemplo de prompt para o GitHub Copilot

> Desenvolva uma calculadora estática de emissão de CO₂e em pt-BR usando HTML, CSS e JavaScript puro com ES Modules. Siga a estrutura e as etapas do PRD, sem frameworks ou dependências. Mantenha os fatores em `config.js`, a consulta de distância em `getDistance()` e os cálculos independentes do DOM. Inclua autocompletar acessível, distância manual, comparação entre bicicleta, carro, ônibus e caminhão, estimativa de créditos de carbono, layout responsivo e documentação das limitações do modelo.

## Publicação no GitHub Pages

O workflow está configurado para executar em pushes na branch `main` e também pode ser iniciado manualmente. Para publicar:

1. Crie um repositório público chamado `calculadora-emissao-carbono` no GitHub.
2. Envie o conteúdo do projeto para a branch `main`.
3. Nas configurações do repositório, defina **Settings → Pages → Build and deployment → Source** como **GitHub Actions**.
4. Execute o workflow **Deploy static site to GitHub Pages** pelo push na branch principal ou manualmente pela aba **Actions**.
5. Confirme a URL indicada pelo GitHub Pages.

Endereço previsto: `https://SEU_USUARIO.github.io/calculadora-emissao-carbono/` — substitua `SEU_USUARIO` pelo nome de usuário do GitHub após a publicação.
