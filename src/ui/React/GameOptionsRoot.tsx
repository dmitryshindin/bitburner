import React, { useState, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";

import { IPlayer } from "../../PersonObjects/IPlayer";

import { Theme } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import createStyles from "@mui/styles/createStyles";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import Grid from "@mui/material/Grid";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";

import DownloadIcon from "@mui/icons-material/Download";
import UploadIcon from "@mui/icons-material/Upload";
import SaveIcon from "@mui/icons-material/Save";

import { FileDiagnosticModal } from "../../Diagnostic/FileDiagnosticModal";
import { dialogBoxCreate } from "./DialogBox";
import { ConfirmationModal } from "./ConfirmationModal";
import { ThemeEditorModal } from "./ThemeEditorModal";
import { StyleEditorModal } from "./StyleEditorModal";

import { SnackbarEvents } from "./Snackbar";

import i18n from "../../i18n/config";
import { Settings } from "../../Settings/Settings";
import { save } from "../../db";
import { formatTime } from "../../utils/helpers/formatTime";
import { OptionSwitch } from "./OptionSwitch";
import { DeleteGameButton } from "./DeleteGameButton";
import { SoftResetButton } from "./SoftResetButton";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: 50,
      padding: theme.spacing(2),
      userSelect: "none",
    },
  }),
);

interface IProps {
  player: IPlayer;
  save: () => void;
  export: () => void;
  forceKill: () => void;
  softReset: () => void;
}

interface ImportData {
  base64: string;
  parsed: any;
  exportDate?: Date;
}

export function GameOptionsRoot(props: IProps): React.ReactElement {
  const classes = useStyles();
  const { t } = useTranslation(["options"]);
  const importInput = useRef<HTMLInputElement>(null);

  const [execTime, setExecTime] = useState(Settings.CodeInstructionRunTime);
  const [logSize, setLogSize] = useState(Settings.MaxLogCapacity);
  const [portSize, setPortSize] = useState(Settings.MaxPortCapacity);
  const [terminalSize, setTerminalSize] = useState(Settings.MaxTerminalCapacity);
  const [autosaveInterval, setAutosaveInterval] = useState(Settings.AutosaveInterval);
  const [timestampFormat, setTimestampFormat] = useState(Settings.TimestampsFormat);
  const [locale, setLocale] = useState(Settings.Locale);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [styleEditorOpen, setStyleEditorOpen] = useState(false);
  const [importSaveOpen, setImportSaveOpen] = useState(false);
  const [importData, setImportData] = useState<ImportData | null>(null);

  function handleExecTimeChange(event: any, newValue: number | number[]): void {
    setExecTime(newValue as number);
    Settings.CodeInstructionRunTime = newValue as number;
  }

  function handleLogSizeChange(event: any, newValue: number | number[]): void {
    setLogSize(newValue as number);
    Settings.MaxLogCapacity = newValue as number;
  }

  function handlePortSizeChange(event: any, newValue: number | number[]): void {
    setPortSize(newValue as number);
    Settings.MaxPortCapacity = newValue as number;
  }

  function handleTerminalSizeChange(event: any, newValue: number | number[]): void {
    setTerminalSize(newValue as number);
    Settings.MaxTerminalCapacity = newValue as number;
  }

  function handleAutosaveIntervalChange(event: any, newValue: number | number[]): void {
    setAutosaveInterval(newValue as number);
    Settings.AutosaveInterval = newValue as number;
  }

  function handleLocaleChange(event: SelectChangeEvent<string>): void {
    setLocale(event.target.value as string);
    Settings.Locale = event.target.value as string;
    i18n.changeLanguage(Settings.Locale);
  }

  function handleTimestampFormatChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setTimestampFormat(event.target.value);
    Settings.TimestampsFormat = event.target.value;
  }

  function startImport(): void {
    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) return;
    const ii = importInput.current;
    if (ii === null) throw new Error("import input should not be null");
    ii.click();
  }

  function onImport(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = event.target.files;
    if (files === null) return;
    const file = files[0];
    if (!file) {
      dialogBoxCreate("Invalid file selected");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (this: FileReader, e: ProgressEvent<FileReader>) {
      const target = e.target;
      if (target === null) {
        console.error("error importing file");
        return;
      }
      const result = target.result;
      if (typeof result !== "string" || result === null) {
        console.error("FileReader event was not type string");
        return;
      }
      const contents = result;

      let newSave;
      try {
        newSave = window.atob(contents);
        newSave = newSave.trim();
      } catch (error) {
        console.log(error); // We'll handle below
      }

      if (!newSave || newSave === "") {
        SnackbarEvents.emit("Save game had not content or was not base64 encoded", "error", 5000);
        return;
      }

      let parsedSave;
      try {
        parsedSave = JSON.parse(newSave);
      } catch (error) {
        console.log(error); // We'll handle below
      }

      if (!parsedSave || parsedSave.ctor !== "BitburnerSaveObject" || !parsedSave.data) {
        SnackbarEvents.emit("Save game did not seem valid", "error", 5000);
        return;
      }

      const data: ImportData = {
        base64: contents,
        parsed: parsedSave,
      };

      const timestamp = parsedSave.data.SaveTimestamp;
      if (timestamp && timestamp !== "0") {
        data.exportDate = new Date(parseInt(timestamp, 10));
      }

      setImportData(data);
      setImportSaveOpen(true);
    };
    reader.readAsText(file);
  }

  function confirmedImportGame(): void {
    if (!importData) return;

    setImportSaveOpen(false);
    save(importData.base64).then(() => {
      setImportData(null);
      setTimeout(() => location.reload(), 1000);
    });
  }

  return (
    <div className={classes.root} style={{ width: "90%" }}>
      <Typography variant="h4" gutterBottom>
        {t("options:options")}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <List>
            <ListItem>
              <Tooltip title={<Typography>{t("options:scriptExecTimeDescription")}</Typography>}>
                <Typography>{t("options:scriptExecTime")}</Typography>
              </Tooltip>
              <Slider
                value={execTime}
                onChange={handleExecTimeChange}
                step={1}
                min={5}
                max={100}
                valueLabelDisplay="auto"
              />
            </ListItem>
            <ListItem>
              <Tooltip title={<Typography>{t("options:netscriptLogSizeDescription")}</Typography>}>
                <Typography>{t("options:netscriptLogSize")}</Typography>
              </Tooltip>
              <Slider
                value={logSize}
                onChange={handleLogSizeChange}
                step={20}
                min={20}
                max={500}
                valueLabelDisplay="auto"
              />
            </ListItem>
            <ListItem>
              <Tooltip title={<Typography>{t("options:netscriptPortSizeDescription")}</Typography>}>
                <Typography>{t("options:netscriptPortSize")}</Typography>
              </Tooltip>
              <Slider
                value={portSize}
                onChange={handlePortSizeChange}
                step={1}
                min={20}
                max={100}
                valueLabelDisplay="auto"
              />
            </ListItem>
            <ListItem>
              <Tooltip title={<Typography>{t("options:terminalCapacityDescription")}</Typography>}>
                <Typography>{t("options:terminalCapacity")}</Typography>
              </Tooltip>
              <Slider
                value={terminalSize}
                onChange={handleTerminalSizeChange}
                step={50}
                min={50}
                max={500}
                valueLabelDisplay="auto"
                marks
              />
            </ListItem>
            <ListItem>
              <Tooltip title={<Typography>{t("options:autosaveIntervalDescription")}</Typography>}>
                <Typography>{t("options:autosaveInterval")}</Typography>
              </Tooltip>
              <Slider
                value={autosaveInterval}
                onChange={handleAutosaveIntervalChange}
                step={30}
                min={0}
                max={600}
                valueLabelDisplay="auto"
                marks
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressMessages}
                onChange={(newValue) => (Settings.SuppressMessages = newValue)}
                text={t("options:suppressStoryMessages")}
                tooltip={t("options:suppressStoryMessagesDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressFactionInvites}
                onChange={(newValue) => (Settings.SuppressFactionInvites = newValue)}
                text={t("options:suppressFactionInvites")}
                tooltip={t("options:suppressFactionInvitesDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressTravelConfirmation}
                onChange={(newValue) => (Settings.SuppressTravelConfirmation = newValue)}
                text={t("options:suppressTravelConfirmations")}
                tooltip={t("options:suppressTravelConfirmationsDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressBuyAugmentationConfirmation}
                onChange={(newValue) => (Settings.SuppressBuyAugmentationConfirmation = newValue)}
                text={t("options:suppressAugmentationsConfirmation")}
                tooltip={t("options:suppressAugmentationsConfirmationDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressTIXPopup}
                onChange={(newValue) => (Settings.SuppressTIXPopup = newValue)}
                text={t("options:suppressTIXMessages")}
                tooltip={t("options:suppressTIXMessagesDescription")}
              />
            </ListItem>
            {!!props.player.bladeburner && (
              <ListItem>
                <OptionSwitch
                  checked={Settings.SuppressBladeburnerPopup}
                  onChange={(newValue) => (Settings.SuppressBladeburnerPopup = newValue)}
                  text={t("options:suppressBladeburnerPopup")}
                  tooltip={t("options:suppressBladeburnerPopupDescription")}
                />
              </ListItem>
            )}
            <ListItem>
              <OptionSwitch
                checked={Settings.SuppressSavedGameToast}
                onChange={(newValue) => (Settings.SuppressSavedGameToast = newValue)}
                text={t("options:suppressAutoSaveGameToast")}
                tooltip={t("options:suppressAutoSaveGameToastDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.DisableHotkeys}
                onChange={(newValue) => (Settings.DisableHotkeys = newValue)}
                text={t("options:disableHotkeys")}
                tooltip={t("options:disableHotkeysDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.DisableASCIIArt}
                onChange={(newValue) => (Settings.DisableASCIIArt = newValue)}
                text={t("options:disableAsciiArt")}
                tooltip={t("options:disableAsciiArtDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.DisableTextEffects}
                onChange={(newValue) => (Settings.DisableTextEffects = newValue)}
                text={t("options:disableTextEffects")}
                tooltip={t("options:disableTextEffectsDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.DisableOverviewProgressBars}
                onChange={(newValue) => (Settings.DisableOverviewProgressBars = newValue)}
                text={t("options:disableOverviewProgressBars")}
                tooltip={t("options:disableOverviewProgressBarsDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.EnableBashHotkeys}
                onChange={(newValue) => (Settings.EnableBashHotkeys = newValue)}
                text={t("options:enableBashHotkeys")}
                tooltip={t("options:enableBashHotkeysDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.UseIEC60027_2}
                onChange={(newValue) => (Settings.UseIEC60027_2 = newValue)}
                text={t("options:useGiBInsteadOfGB")}
                tooltip={t("options:useGiBInsteadOfGBDescription")}
              />
            </ListItem>
            <ListItem>
              <OptionSwitch
                checked={Settings.ExcludeRunningScriptsFromSave}
                onChange={(newValue) => (Settings.ExcludeRunningScriptsFromSave = newValue)}
                text={t("options:excludeRunningScriptsFromSave")}
                tooltip={t("options:excludeRunningScriptsFromSaveDescription")}
              />
            </ListItem>
            <ListItem>
              <Tooltip title={<Typography>{t("options:timestampFormatDescription")}</Typography>}>
                <span>
                  <TextField
                    InputProps={{
                      startAdornment: (
                        <Typography
                          color={
                            formatTime(timestampFormat) === "format error" && timestampFormat !== ""
                              ? "error"
                              : "success"
                          }
                        >
                          {t("options:timestampFormat")}
                        </Typography>
                      ),
                    }}
                    value={timestampFormat}
                    onChange={handleTimestampFormatChange}
                    placeholder="yyyy-MM-dd hh:mm:ss"
                  />
                </span>
              </Tooltip>
            </ListItem>

            <ListItem>
              <OptionSwitch
                checked={Settings.SaveGameOnFileSave}
                onChange={(newValue) => (Settings.SaveGameOnFileSave = newValue)}
                text={t("options:saveGameOnFileSave")}
                tooltip={t("options:saveGameOnFileSaveDescription")}
              />
            </ListItem>

            <ListItem>
              <Tooltip title={<Typography>{t("options:localeDescription")}</Typography>}>
                <Typography>{t("options:locale")}</Typography>
              </Tooltip>
              <Select value={locale} onChange={handleLocaleChange}>
                <MenuItem value="en">en</MenuItem>
                <MenuItem value="bg">bg</MenuItem>
                <MenuItem value="cs">cs</MenuItem>
                <MenuItem value="da-dk">da-dk</MenuItem>
                <MenuItem value="de">de</MenuItem>
                <MenuItem value="en-au">en-au</MenuItem>
                <MenuItem value="en-gb">en-gb</MenuItem>
                <MenuItem value="es">es</MenuItem>
                <MenuItem value="fr">fr</MenuItem>
                <MenuItem value="hu">hu</MenuItem>
                <MenuItem value="it">it</MenuItem>
                <MenuItem value="lv">lv</MenuItem>
                <MenuItem value="no">no</MenuItem>
                <MenuItem value="pl">pl</MenuItem>
                <MenuItem value="ru">ru</MenuItem>
              </Select>
            </ListItem>
          </List>
          {!location.href.startsWith("file://") && (
            <>
              <ListItem>
                <Typography>danielyxie / BigD ({t("options:originalDeveloper")}): </Typography>
                <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                  <input type="hidden" name="cmd" value="_s-xclick" />
                  <input
                    type="hidden"
                    name="encrypted"
                    value="-----BEGIN PKCS7-----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-----END PKCS7-----"
                  />
                  <input
                    type="image"
                    src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif"
                    name="submit"
                    alt="PayPal - The safer, easier way to pay online!"
                  />
                </form>
              </ListItem>

              <ListItem>
                <Typography>
                  hydroflame ({t("options:currentMaintainer")}):{" "}
                  <Link href="https://www.google.com/search?q=Where+to+donate+blood+near+me%3F" target="_blank">
                    {t("options:donateDescription")}
                  </Link>{" "}
                </Typography>
              </ListItem>
            </>
          )}
        </Grid>
        <Box sx={{ display: "grid", width: "fit-content", height: "fit-content" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <Button onClick={() => props.save()} startIcon={<SaveIcon />}>
              {t("options:saveGame")}
            </Button>
            <DeleteGameButton />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <Tooltip title={<Typography>{t("options:exportGameDescription")}</Typography>}>
              <Button onClick={() => props.export()} startIcon={<DownloadIcon />}>
                {t("options:exportGame")}
              </Button>
            </Tooltip>
            <Tooltip
              title={
                <Typography>
                  <Trans t={t} i18nKey="options:importGameDescription">
                    Import your game from a text file.
                    <br />
                    This will <strong>overwrite</strong> your current game. Back it up first!
                  </Trans>
                </Typography>
              }
            >
              <Button onClick={startImport} startIcon={<UploadIcon />}>
                {t("options:importGame")}
                <input ref={importInput} id="import-game-file-selector" type="file" hidden onChange={onImport} />
              </Button>
            </Tooltip>
            <ConfirmationModal
              open={importSaveOpen}
              onClose={() => setImportSaveOpen(false)}
              onConfirm={() => confirmedImportGame()}
              confirmationText={
                <>
                  <Trans t={t} i18nKey="options:importGameWarning">
                    Importing a new game will <strong>completely wipe</strong> the current data!
                    <br />
                    <br />
                    Make sure to have a backup of your current save file before importing.
                    <br />
                    The file you are attempting to import seems valid.
                    <br />
                    <br />
                  </Trans>
                  {importData?.exportDate && (
                    <Trans t={t} i18nKey="options:importGameExportDate">
                      The export date of the save file is{" "}
                      <strong> {{ date: importData.exportDate.toString() }} </strong>
                      <br />
                      <br />
                    </Trans>
                  )}
                </>
              }
            />
          </Box>
          <Box sx={{ display: "grid" }}>
            <Tooltip title={<Typography>{t("options:forceKillAllScriptsDescription")}</Typography>}>
              <Button onClick={() => props.forceKill()}>{t("options:forceKillAllScripts")}</Button>
            </Tooltip>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <SoftResetButton
              noConfirmation={Settings.SuppressBuyAugmentationConfirmation}
              onTriggered={props.softReset}
            />
            <Tooltip title={<Typography>{t("options:diagnoseFilesDescription")}</Typography>}>
              <Button onClick={() => setDiagnosticOpen(true)}>{t("options:diagnoseFiles")}</Button>
            </Tooltip>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <Button onClick={() => setThemeEditorOpen(true)}>{t("options:themeEditor")}</Button>
            <Button onClick={() => setStyleEditorOpen(true)}>{t("options:styleEditor")}</Button>
          </Box>
          <Box>
            <Link href="https://github.com/danielyxie/bitburner/issues/new" target="_blank">
              <Typography>{t("options:reportBug")}</Typography>
            </Link>
            <Link href="https://bitburner.readthedocs.io/en/latest/changelog.html" target="_blank">
              <Typography>{t("options:changelog")}</Typography>
            </Link>
            <Link href="https://bitburner.readthedocs.io/en/latest/index.html" target="_blank">
              <Typography>{t("options:documentation")}</Typography>
            </Link>
            <Link href="https://discord.gg/TFc3hKD" target="_blank">
              <Typography>{t("options:discord")}</Typography>
            </Link>
            <Link href="https://www.reddit.com/r/bitburner" target="_blank">
              <Typography>{t("options:reddit")}</Typography>
            </Link>
            <Link href="https://plaza.dsolver.ca/games/bitburner" target="_blank">
              <Typography>{t("options:incrementalGamePlaza")}</Typography>
            </Link>
          </Box>
        </Box>
      </Grid>
      <FileDiagnosticModal open={diagnosticOpen} onClose={() => setDiagnosticOpen(false)} />
      <ThemeEditorModal open={themeEditorOpen} onClose={() => setThemeEditorOpen(false)} />
      <StyleEditorModal open={styleEditorOpen} onClose={() => setStyleEditorOpen(false)} />
    </div>
  );
}
