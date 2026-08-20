## [0.7.0](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.6.1...v0.7.0) (2026-08-20)

### Features

* support a nested Note, closing the largest remaining blocker ([46afdf9](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/46afdf9cb4ddfbb33034f1bbae15ceeeb6cd0d60))

### Bug Fixes

* confirm 2 more ServingRelationship mappings, closing the last private-model gaps ([94f8ca7](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/94f8ca75f385b69027af41eb11189a193e0ecd9c))

## [0.6.1](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.6.0...v0.6.1) (2026-08-19)

### Bug Fixes

* emit AccessRelationship accessType, and confirm 23 more relationship mappings ([44d6f0b](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/44d6f0b6da5e97a8755dd0efbc047136c2872cbc))

## [0.6.0](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.5.0...v0.6.0) (2026-08-19)

### Features

* draw DiagramModelReference (view-reference shape) when it targets a view in the same model ([449dc28](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/449dc28546e65dcda4c80e4cc18a9cde7fa26f4a))
* represent purely-visual connections as ArchiMate:ViewEdge, closing the 92-vs-93 connector gap ([809e399](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/809e39903ca59c2003e80265317e143e81451f97))

## [0.5.0](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.4.3...v0.5.0) (2026-08-19)

### Features

* add CommonJS build alongside ESM, MIT license, and CI hygiene tooling ([7846a2f](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/7846a2f0a54b3416f1e28529aca08c4869767383))

### Bug Fixes

* **ci:** resync package-lock.json with missing platform-specific optional deps ([0270740](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/02707405361c9c40c2dfac5627d337dc0de3883b))
* harden input handling and resolve confirmed correctness gaps against the reference fixtures ([8d43f70](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/8d43f7088f68683562b66b3a00dd32b7a46b92b7)), closes [#ff0000](https://github.com/Continuous-DrivenArchitecture/adapter-xma/issues/ff0000)

## [0.4.3](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.4.2...v0.4.3) (2026-08-18)

### Bug Fixes

* omit the graphical connector for a relationship already conveyed by nesting ([b4bfbea](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/b4bfbea4e5b895baa114e04dd054236ac9b572df))

## [0.4.2](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.4.1...v0.4.2) (2026-08-18)

### Bug Fixes

* correct Relations scheme placement and restore missing collection ids ([c697698](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/c69769850b3999d2c247239f6454d9189eabfd04))

## [0.4.1](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.4.0...v0.4.1) (2026-08-18)

### Bug Fixes

* stop blocking serialization on 3 recoverable diagnostics ([d6fbae3](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/d6fbae3365a360f8b205971d156dfc5e883fc34c))

## [0.4.0](https://github.com/Continuous-DrivenArchitecture/adapter-xma/compare/v0.3.0...v0.4.0) (2026-08-18)

### Features

* support nested diagram objects up to 3 levels deep ([e04eb6d](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/e04eb6df32f495b983f1e230c5912f71839fd27d))

### Bug Fixes

* **release:** correct package.json version and changelog after semantic-release miscomputed 1.0.0 ([357f488](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/357f488aeb64fb617d0a4e6a1f492ae7c71958c2))
* **release:** disable npm provenance (repo is private, sigstore requires public) ([4b4f3a5](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/4b4f3a5849b52072674f5b129338e4bc61b931ee))

## 0.3.0 (2026-08-18)

Retroactive changelog entry covering all history up to and including the
0.3.0 npm release (published before semantic-release was configured; this
was the first run of the automated changelog, which by default summarized
the entire commit history rather than only what changed since 0.3.0).

### Features

* add multi-view, Junction, and generic relationship-form support ([7598341](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/7598341e86cb5471177f46295d5aca3aa576b89c))
* confirm 20 more relationship mappings from the Agile Manifesto fixture ([de0f44b](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/de0f44bbf3a908c3399ba95c32ecdbd1a9d505ba))
* confirm 64 additional relationship mappings from the SABSA fixture ([9994928](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/9994928b10cfbdc20f50b58e7792c867790f2802))
* initial XMA adapter for the CDA ecosystem ([c10f80c](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/c10f80c4742145de9ee81d0bfce29df596d473da))
* support nested diagram objects up to 3 levels deep ([e04eb6d](https://github.com/Continuous-DrivenArchitecture/adapter-xma/commit/e04eb6df32f495b983f1e230c5912f71839fd27d))
