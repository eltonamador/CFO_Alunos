# Sobre o aplicativo

Retrato do autor exibido na tela `/sobre`:

    cap-amador.jpg

A arte é uma ilustração de meio corpo sobre fundo branco (1104×944). O
enquadramento circular é feito por CSS, controlado por
`APP_INFO.author.portraitFraming` em `src/lib/app-info.ts`:

- `zoom`   — ampliação sobre o recorte quadrado
- `focusX` / `focusY` — ponto da imagem (% da largura/altura) que fica no
  centro do círculo

Os valores atuais (`zoom: 1.4, focusX: 46, focusY: 33`) enquadram cabeça,
ombros e distintivos do peito. Se trocar por um retrato já recortado
(quadrado, centrado no rosto), use `zoom: 1, focusX: 50, focusY: 50`.

Se o arquivo não existir, a tela degrada para as iniciais do autor sobre fundo
vermelho-CBMAP — sem quebrar o layout.
