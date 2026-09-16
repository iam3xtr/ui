# @iam3xtr/ui

Визуальная основа для приложений 3xtr.im.

Владеет дизайн-токенами, CSS/SCSS-темами и общими визуальными ассетами вроде
логотипа и SVG лоадера. Не владеет Vue-компонентами, состоянием приложения,
роутингом или доменной логикой — эта граница принадлежит `@iam3xtr/vue`
(компоненты/composables) и каждому потребляющему приложению.

## Два независимых контракта

Пакет предоставляет две входные точки, между которыми выбирает потребитель;
ни одна не требует другую, а установка/импорт tokens-only входной точки
никогда не тянет за собой Bulma, Buefy или рантайм Vue.

### Только токены

```js
import "@iam3xtr/ui/styles/tokens.css"; // предкомпилировано, Dart Sass не нужен
```

```scss
@use "@iam3xtr/ui/styles/tokens.scss"; // Sass-исходник, если компилируете сами
```

Определяет runtime custom properties `--tr-*` (брендовые/семантические
цвета, поверхности, текст, границы и шкалу z-index) как для
`:root[data-theme="light"]`, так и для `:root[data-theme="dark"]`. Никакого
reset, никаких компонентных стилей, никакого Bulma/Buefy, никакого
JavaScript.

### Полная тема

```js
import Buefy from "buefy";
import "@iam3xtr/ui/styles/theme.css"; // либо theme.scss, см. ниже
```

```scss
@use "@iam3xtr/ui/styles/theme.scss";
```

Полная тема компонентов Bulma/Buefy (shell, навигация, формы, таблицы,
оверлеи и т. д.) — включает те же токены, что и выше (без дублирования),
плюс все затемлённые селекторы. Требует, чтобы потребитель сам установил
`bulma` и `buefy` (здесь они объявлены как опциональные
`peerDependencies`, чтобы tokens-only потребитель никогда не получал их
транзитивно) и подключил Buefy/Bulma ровно один раз. Не подключайте
одновременно `buefy/dist/css/buefy.css` — это даст два конфликтующих
стилевых файла.

Компиляция `theme.scss` самостоятельно (вместо использования готового
`theme.css`) требует, чтобы `bulma` и `buefy` резолвились из вашего
собственного `node_modules`, так как файл делает
`@use "bulma/sass" with (...)` и `@use "buefy/src/scss/buefy"`.

### Ассеты

```js
import logo from "@iam3xtr/ui/assets/logo.svg";
import loader from "@iam3xtr/ui/assets/loader-mono.svg";
import anthropicIcon from "@iam3xtr/ui/assets/icons/anthropic.svg";
```

Сырые SVG-файлы, резолвятся собственным bundler/asset-пайплайном
потребителя (например, `vite-svg-loader`) — здесь нет захардкоженного
абсолютного пути или допущения об app base path, поэтому они корректно
резолвятся под любым `base`/publicPath. Набор иконок — это одобренный
реестр кастомных иконок, задокументированный в
[`docs/design-system.md`](https://github.com/iam3xtr/trickster-ui-kit/blob/main/docs/design-system.md#иконки)
(логотипы вендоров LLM, fallback вендора и иконки видов моделей) — всё
остальное в UI — это имя Material Design Icons (`@mdi/font`, подключается
потребителем явно и ровно один раз; этот пакет не поставляет шрифт или
подмножество MDI).

## Тема

Тема переключается потребителем через
`document.documentElement.dataset.theme = "light" | "dark"`; обе входные
точки стилизуются по этому атрибуту, а не по классу.

## Чего здесь нет

Нет fixtures, `.env`-файлов, build-секретов, демо-данных или второй копии
темы. Нет Vue-компонентов, Pinia stores, роутинга или доменной/продуктовой
логики — за этим см. `@iam3xtr/vue` и потребляющее приложение.

## Разработка

```bash
npm install   # подтягивает bulma/buefy/sass как devDependencies, нужны для сборки theme.css
npm run build # компилирует dist/tokens.css и dist/theme.css
npm test      # собирает, затем прогоняет контрактные тесты exports/allowlist/pack
```

## Публикация

Публикуйте этот пакет **до** `@iam3xtr/vue` — `@iam3xtr/vue` объявляет
`@iam3xtr/ui` как peer-зависимость, поэтому потребитель, резолвящий оба
пакета, должен всегда находить уже опубликованную совместимую версию
`@iam3xtr/ui`. Полный релизный процесс — порядок публикации, таблица
рекомендуемой пары, тарбол/registry consumer-матрица, восстановление после
partial publish и rollback — задокументирован одним нормативным текстом в
[`docs/release-process.md`](https://github.com/iam3xtr/trickster-ui-kit/blob/main/docs/release-process.md)
в репозитории UI Kit; здесь не дублируется.

Релиз оформляется пушем тега `vX.Y.Z`, точно совпадающего с `version` из
`package.json` — [`.github/workflows/release.yml`](.github/workflows/release.yml)
затем прогоняет полный набор тестов, отказывает при несовпадении тега с
версией или уже опубликованной версии и публикует в `npm.pkg.github.com`
под GitHub `environment: release` (настройте там required reviewers, чтобы
каждую публикацию подтверждал человек). `packages:write` запрашивает только
эта джоба; [`.github/workflows/ci.yml`](.github/workflows/ci.yml), который
запускается на каждый push/PR, остаётся на `contents: read`. Полное
разграничение кредов (`GITHUB_TOKEN` против cross-repo read токена) и
диагностика отказа доступа — в `docs/release-process.md`, здесь не
дублируется.
