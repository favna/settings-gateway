# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

<!--
NOTE: For the contributors, you add new entries to this document following this format:
- [[#PRNUMBER](https://github.com/dirigeants/settings-gateway/pull/PRNUMBER)] The change that has been made. (Author's Github name)
-->

## 0.0.1

### Added

- [[#1][]] Added Unit Testing. (kyranet)
- [[#1][]] Added examples for a large set of methods. (kyranet)
- [[#1][]] Added bare `null` as an option to reset a key in `SettingsFolder`#{`update`}. (kyranet)
- [[#1][]] Added `Serializer`#{`validate`,`resolve`} to allow further control on how SettingsGateway handles the data. (kyranet)
- [[#1][]] Added `context` to the `settingsUpdate` and `settingsCreate` events, they contain the raw changes, guild, language, etc. (kyranet)
- [[#1][]] Added `extraContext` to the `SettingsFolderResetOptions` type, this value is pased in all places (`Serializer`#`validate`, `SchemaEntry`#`filter`, `settingsUpdate` and `settingsCreate` events, and more). (kyranet)

### Changed

- [[#1][]] Tweaked `Serializer`#`deserialize`'s arguments to (`SerializableValue`, `SerializerUpdateContext`). (kyranet)
- [[#1][]] Renamed `SchemaEntry`#{`min`,`max`} to `SchemaEntry`#{`minimum`,`maximum`}. (kyranet)
- [[#1][]] Tweaked `SettingsFolder`'s value type to be more accurate. (kyranet)
- [[#1][]] Tweaked `SettingsFolderUpdateOptions`'s option to produce a TypeScript compiler error when `arrayAction` is set to `'overwrite'` and `arrayIndex` is defined. (kyranet)
- [[#1][]] Tweaked `SettingsFolder`#`client` to throw an error when it's uninitialized. (kyranet)
- [[#1][]] Tweaked `SettingsFolder`#{`reset`,`update`} to return a much more useful struct. (kyranet)
- [[#1][]] When specifying `arrayIndex` in `SettingsFolder`#`update` and `arrayAction` is defined as `add`, all entries will be inserted at given index. (kyranet)
- [[#1][]] When specifying `arrayIndex` in `SettingsFolder`#`update` and `arrayAction` is defined as `remove`, as many entries as given will be removed from given index. (kyranet)
- [[#1][]] When specifying `arrayIndex` in `SettingsFolder`#`update` and `arrayAction` is not defined or defined as `auto`, all entries will replace the existing ones. (kyranet)

### Removed

- [[#1][]] Removed `throwOnError` option in `SettingsFolder`#{`reset`,`update`}, they will now always throw when they encounter an error. (kyranet)

### Fixed

- [[#1][]] Resolved bug where `Schema`#`get` would throw an error if a path did not exist. (kyranet)
- [[#1][]] Resolved bug where `Schema`#{`add`,`remove`} was still callable even after being initialized. (kyranet)
- [[#1][]] Resolved bug where `SettingsFolder`#`get` would throw an error if a path did not exist. (kyranet)
- [[#1][]] Resolved type bug in `SettingsFolder`#`pluck`. (kyranet)
- [[#1][]] Resolved bug in `SettingsFolder`#`resolve` not resolving into objects when specifying a folder path. (kyranet)
- [[#1][]] Resolved bug in `SettingsFolder`#`reset` where database conditions were not handled correctly. (kyranet)
- [[#1][]] Resolved bug in `SettingsFolder`#`update` where options would sometimes type error. (kyranet)
- [[#1][]] Resolved bug in `SettingsFolder`'s patch function not allowing non-literal objects to be used. (kyranet)
- [[#1][]] Resolved bug in `SettingsFolder`#{`reset`,`update`} patching after emit. (kyranet)
- [[#1][]] Fixed the types from the `Provider` and `SQLProvider` classes. (kyranet)

<!-- References, they're to shorten lines -->
[#1]: https://github.com/dirigeants/settings-gateway/pull/1
