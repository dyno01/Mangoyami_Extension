import '../../../../../model/source.dart';

const _animeworldindiaVersion = "0.0.40";
const _animeworldindiaSourceCodeUrl =
    "https://raw.githubusercontent.com/dyno01/Mangoyami_Extension/refs/heads/main/dart/anime/src/all/animeworldindia/animeworldindia.dart";

String _iconUrl =
    "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/$branchName/dart/anime/src/all/animeworldindia/icon.png";

List<String> _languages = [
  "all",
  "en",
  "bn",
  "hi",
  "ja",
  "ml",
  "mr",
  "ta",
  "te",
];

List<Source> get animeworldindiaSourcesList => _animeworldindiaSourcesList;
List<Source> _animeworldindiaSourcesList =
    _languages
        .map(
          (e) => Source(
            name: 'AnimeWorld India',
            baseUrl: "https://watchanimeworld.in",
            lang: e,
            typeSource: "multiple",
            iconUrl: _iconUrl,
            version: _animeworldindiaVersion,
            itemType: ItemType.anime,
            sourceCodeUrl: _animeworldindiaSourceCodeUrl,
          ),
        )
        .toList();
