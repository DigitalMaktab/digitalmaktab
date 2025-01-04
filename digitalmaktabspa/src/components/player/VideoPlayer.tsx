import React, { useEffect, useState } from "react";
import Plyr, { PlyrOptions } from "plyr-react";
import "plyr-react/plyr.css";
import { MediaType, Source } from "plyr";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { VideoPlayerProps } from "./properties/VideoPlayerProps";
import settings from "../../config/settings";

const AppPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  const { t, i18n } = useAppLocalizer();
  const [playerOptions, setPlayerOptions] = useState<PlyrOptions | null>(null);
  console.log("src", src);
  const videoOptions: { type: MediaType; sources: Source[]; poster: string } = {
    type: "video",
    sources: [
      {
        src: settings.url + src,
        type: "video/mp4" as MediaType,
      },
    ],
    poster: "/demo.png",
  };

  useEffect(() => {
    const generatePlayerOptions = (): PlyrOptions => ({
      controls: [
        "play-large",
        "play",
        "rewind",
        "fast-forward",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "captions",
        "settings",
        "pip",
        "airplay",
        "fullscreen",
      ],
      settings: ["captions", "quality", "speed", "loop"],
      tooltips: { controls: true, seek: true },
      autoplay: false,
      loop: { active: false },
      i18n: {
        ...i18n,
        play: t("plyr.play"),
        pause: t("plyr.pause"),
        pip: t("plyr.pip"),
        enterFullscreen: t("plyr.enterFullscreen"),
        exitFullscreen: t("plyr.exitFullscreen"),
        quality: t("plyr.quality"),
        speed: t("plyr.speed"),
        normal: t("plyr.normal"),
        captions: t("plyr.captions"),
        settings: t("plyr.settings"),
        rewind: t("plyr.rewind"),
        fastForward: t("plyr.fastForward"),
        volume: t("plyr.volume"),
        mute: t("plyr.mute"),
        unmute: t("plyr.unmute"),
      },
    });

    setPlayerOptions(generatePlayerOptions());
  }, [t, i18n]);

  return <Plyr source={videoOptions} options={playerOptions} />;
};

export default AppPlayer;
