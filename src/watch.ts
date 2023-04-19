import { watch, WatchOptions } from "chokidar";
import { debounce } from "perfect-debounce";
import { resolve } from "pathe";
import type {
  UserInputConfig,
  ConfigLayerMeta,
  ResolvedConfig,
  LoadConfigOptions,
} from "./types";
import { loadConfig } from "./loader";

export type ConfigWatcher<
  T extends UserInputConfig = UserInputConfig,
  MT extends ConfigLayerMeta = ConfigLayerMeta
> = ResolvedConfig<T, MT> & {
  watchingFiles: string[];
  unwatch: () => Promise<void>;
};

export type WatchConfigOptions<
  T extends UserInputConfig = UserInputConfig,
  MT extends ConfigLayerMeta = ConfigLayerMeta
> = {
  chokidarOptions?: WatchOptions;
  debounce?: false | number;
  onChange?: (payload: {
    type: "created" | "updated" | "removed";
    path: string;
    config: ResolvedConfig<T, MT>;
    oldConfig: ResolvedConfig<T, MT>;
  }) => void;
};

const eventMap = {
  add: "created",
  change: "updated",
  unlink: "removed",
} as const;

export async function watchConfig<
  T extends UserInputConfig = UserInputConfig,
  MT extends ConfigLayerMeta = ConfigLayerMeta
>(
  options: LoadConfigOptions<T, MT> & WatchConfigOptions
): Promise<ConfigWatcher<T, MT>> {
  let config = await loadConfig<T, MT>(options);

  const configName = options.name || "config";
  const watchingFiles = [
    ...new Set(
      (config.layers || [])
        .filter((l) => l.cwd)
        .flatMap((l) => [
          ...["ts", "js", "mjs", "cjs", "cts", "mts", "json"].map((ext) =>
            resolve(l.cwd!, (options.name || "config") + "." + ext)
          ),
          l.source && resolve(l.cwd!, l.source),
          // TODO: Support watching rc from home and workspace
          options.rcFile &&
            resolve(
              l.cwd!,
              typeof options.rcFile === "string"
                ? options.rcFile
                : `.${configName}rc`
            ),
          options.packageJson && resolve(l.cwd!, "package.json"),
        ])
        .filter(Boolean)
    ),
  ] as string[];

  const _fswatcher = watch(watchingFiles, {
    ignoreInitial: true,
    ...options.chokidarOptions,
  });

  const onChange = async (event: string, path: string) => {
    const type = eventMap[event as keyof typeof eventMap];
    if (!type) {
      return;
    }
    const oldConfig = config;
    config = await loadConfig(options);
    if (options.onChange) {
      options.onChange({ type, path, config, oldConfig });
    }
  };

  if (options.debounce !== false) {
    _fswatcher.on("all", debounce(onChange, options.debounce));
  } else {
    _fswatcher.on("all", onChange);
  }

  const utils: Partial<ConfigWatcher<T, MT>> = {
    watchingFiles,
    unwatch: async () => {
      await _fswatcher.close();
    },
  };

  return new Proxy<ConfigWatcher<T, MT>>(utils as ConfigWatcher<T, MT>, {
    get(_, prop) {
      if (prop in utils) {
        return utils[prop as keyof typeof utils];
      }
      return config[prop as keyof ResolvedConfig<T, MT>];
    },
  });
}
