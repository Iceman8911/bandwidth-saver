import { type Browser, browser } from "wxt/browser";
import type { BlockSettingsSchema } from "@/models/storage";
import {
	DeclarativeNetRequestPriority,
	DeclarativeNetRequestRuleIds,
} from "@/shared/constants";
import type {
	DefaultDnrRuleModifierPayload,
	SiteScopedDnrRuleModifierPayloadEntry,
} from "@/utils/dnr-rules";

const IMAGE_EXTENSION_REGEX_PART =
	"3dmlw|3dm|3dmf|3ds|3dv|3mf|abc|ac|ai|amf|ani|an8|aoi|art|asm|awg|b3d|bbmodel|bdl4|bfres|bik|blend|blp|block|bmd3|bmp|bpm|brres|braw|btm|btp|bti|bw|c4|c4d|cal3d|cals|ccp4|cd5|cel|cfl|cfu|cgm|cit|clip|cmx|cob|core3d|cpl|cr2|crw|ctm|cur|cwp|c4d|dae|dat|dds|dib|djvu|dn|dp|dpm|drawio|dts|dwd|dxf|e2d|ec3|egg|egt|emf|emz|ens|eps|epsi|epsf|exif|exr|fact|fbx|flm|flp|fs|ftm|fur|g|gbr|gif|gifv|glb|glm|gltf|gmv|grf|grir|gym|hdr|hec|heic|heics|heif|heifs|icb|icns|ico|iff|ilbm|int|io|iob|jas|jfif|jif|jmesh|jng|jp2|jpe|jpeg|jpg|jps|jxl|j2c|j2k|jpf|jpx|kra|lbm|ldr|logic|lwo|lws|lxf|lxo|m3d|m4v|ma|max|mb|mesh|miff|mio|miobject|miparticle|mimodel|mm3d|mmp|mmpz|mmr|mng|movie.byu|mpd|mpo|mrc|msp|mx6hs|mxf|nef|nif|nitf|npr|nrw|nsv|nwc|nwd|nwf|obj|odg|off|ogex|ogg|omf|omfi|orf|otb|ots|pbm|pc1|pc2|pc3|pcf|pcx|pct|pdd|pdf|pdn|pgf|pgm|pi1|pi2|pi3|pic|pict|pix|ply|pnm|png|pnj|pns|ppm|procreate|prc|prt|psb|psd|psp|ptb|ptx|ptf|pts|pvd|pvm|px|pxm|pxr|pxz|qau|qau0|qfx|qmg|qoi|que|queaudio|raw|r3d|rgb|rle|rmj|roq|rw2|rwx|s3m|sc|sct|sf2|sf3|sf4|sfd|sfk|sfl|sgi|sia|sib|sid|skp|sldasm|sldprt|smk|smp|sng|snf|spc|stl|stf|svg|svgz|swa|sxd|syn|t11|t42|targa|tdf|tfm|tgax|tga|thd|thp|tif|tiff|tres|ttc|ttf|txm|u3d|ufo|usd|usda|usdc|usdz|ust|ustx|v2d|vcls|vda|vdoc|vgm|vim|vox|vpr|vsd|vsdx|vst|vtf|vtt|vue|vwx|w3d|wav|webm|webp|webvtt|wings|wmf|wmz|wrl|x|x3d|xar|xbm|xcf|xm|xpm|yuv|ym|z3d|zbmx|zif";
const MEDIA_EXTENSION_REGEX_PART =
	"16svx|3g2|3gp|8svx|a3s|aac|ac3|aaf|adp|adt|adts|aif|aifc|aiff|alc|alp|als|amr|ape|asf|ast|atmos|au|audio|aup|aup3|avchd|avi|aw|band|bcwav|bik|brstm|braw|btm|cau|cel|cmfa|cmft|cmfv|cpr|cwp|cwav|dat|dff|dmkit|drm|dsf|dtshd|dtsma|dvr-ms|dwd|dwp|ec3|ens|f4v|flac|flm|flp|fmp4|flv|ftm|fur|gmv|grir|gsm|gym|h264|h265|hevc|ism|ismv|it|jam|la|logic|m1a|m1v|m2a|m2ts|m2v|m3a|m3u|m3u8|m4a|m4b|m4p|m4r|m4s|m4v|media|metadata|mid|midi|mka|mkv|mmp|mmpz|mmr|mng|mod|mov|mp1|mp2|mp3|mp4|mp4a|mp4v|mpc|mpd|mpe|mpeg|mpg|mt2|mts|mxf|mx6hs|nef|niff|npr|nsf|nsv|ofr|ofs|off|oga|ogg|ogv|ogx|omf|omfi|ots|pac|psf|pss|ptb|ptx|ptf|pts|pvd|qau|qmg|queyeaudio|ra|ram|raw|rin|rka|rm|rmi|rmj|rmvb|roq|rpp|rpp-bak|ses|sf2|sf3|sf4|sfk|sfl|shn|sid|smk|smp|snd|sng|spc|spx|stf|svi|svp|swa|swf|syn|tak|thd|thp|ts|tta|txm|ust|ustx|vcls|vob|vgm|vox|vpr|vqf|vsq|vsqx|wav|webm|webvtt|wma|wmv|wtv|wv|xm|ym|yuv";
const FONT_EXTENSION_REGEX_PART =
	"abf|afm|bdf|bmf|brfnt|dfont|eot|fnt|fon|fond|mgf|otf|otn|pcf|pfa|pfb|pfm|sfd|snf|t11|t42|tdf|tfm|ttc|ttf|ufo|woff|woff2";

const BLOCK_RULE_ACTION: Browser.declarativeNetRequest.RuleAction = {
	type: "block",
};

function getResourceTypesToBlockFromBlockSettings({
	font,
	image,
	media,
	script,
	style,
}: BlockSettingsSchema): `${Browser.declarativeNetRequest.ResourceType}`[] {
	const resourceTypes: `${Browser.declarativeNetRequest.ResourceType}`[] = [];

	if (font) resourceTypes.push("font");
	if (image) resourceTypes.push("image");
	if (media) resourceTypes.push("media");
	if (script) resourceTypes.push("script");
	if (style) resourceTypes.push("stylesheet");

	return resourceTypes;
}

function getXhrRegexFromBlockSettings({
	font,
	image,
	media,
}: BlockSettingsSchema): string | null {
	const extGroups: string[] = [];
	if (image) extGroups.push(IMAGE_EXTENSION_REGEX_PART);
	if (media) extGroups.push(MEDIA_EXTENSION_REGEX_PART);
	if (font) extGroups.push(FONT_EXTENSION_REGEX_PART);

	if (!extGroups.length) return null;

	const allExts = extGroups.join("|");
	return `.*(?i)\\.(${allExts})(?:\\?.*)?$`;
}

export async function applyDefaultBlockRules({
	general: { enabled: isEnabled },
	block: blockSettings,
	excludedDomains,
}: DefaultDnrRuleModifierPayload): Promise<void> {
	const resourceTypes = getResourceTypesToBlockFromBlockSettings(blockSettings);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && resourceTypes.length
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								excludedInitiatorDomains: excludedDomains.length
									? [...excludedDomains]
									: undefined,
								resourceTypes,
							},
							id: DeclarativeNetRequestRuleIds.DEFAULT_RESOURCE_TYPE_BLOCKING,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [
			DeclarativeNetRequestRuleIds.DEFAULT_RESOURCE_TYPE_BLOCKING,
		],
	});

	const possibleRegex = getXhrRegexFromBlockSettings(blockSettings);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && possibleRegex
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								excludedInitiatorDomains: excludedDomains.length
									? [...excludedDomains]
									: undefined,
								regexFilter: possibleRegex,
							},
							id: DeclarativeNetRequestRuleIds.DEFAULT_EXTENSION_BLOCKING,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [DeclarativeNetRequestRuleIds.DEFAULT_EXTENSION_BLOCKING],
	});
}

export async function applySiteScopedBlockRules([
	host,
	{
		general: { enabled, useSiteRule },
		block: blockSettings,
		ids: { assetTypeBlock: assetTypeBlockId, assetExtBlock: assetExtBlockId },
	},
]: SiteScopedDnrRuleModifierPayloadEntry) {
	const isEnabled = enabled && useSiteRule;

	const resourceTypes = getResourceTypesToBlockFromBlockSettings(blockSettings);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && resourceTypes.length
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								initiatorDomains: [host],
								resourceTypes,
							},
							id: assetTypeBlockId,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [assetTypeBlockId],
	});

	const possibleRegex = getXhrRegexFromBlockSettings(blockSettings);

	await browser.declarativeNetRequest.updateSessionRules({
		addRules:
			isEnabled && possibleRegex
				? [
						{
							action: BLOCK_RULE_ACTION,
							condition: {
								initiatorDomains: [host],
								regexFilter: possibleRegex,
							},
							id: assetExtBlockId,
							priority: DeclarativeNetRequestPriority.HIGHEST,
						},
					]
				: undefined,
		removeRuleIds: [assetExtBlockId],
	});
}
