# Contributing

Thanks for helping with pi-superspec.

## Workflow

Changes to this repository go through the OpenSpec workflow: propose the change under `openspec/changes/<name>/`, implement it, then archive it. Follow the rules in `openspec/config.yaml`, whose `context` section applies to every change.

The product schema that this package ships lives in `schema/superspec/`. The copy in `openspec/schemas/superspec/` is the upstream v4 schema used by this repository itself; it is never edited.

## Checks

Run both before opening a pull request:

```sh
npm test
npm run typecheck
```

## Language

All repository content is written in English, except `README.vi.md`, which is the Vietnamese translation of the README.

## Keeping the READMEs in sync

`README.md` and `README.vi.md` must describe the same things. When you change one, make the matching change in the other in the same pull request.
