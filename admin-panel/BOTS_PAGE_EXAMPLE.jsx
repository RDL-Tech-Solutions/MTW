// Exemplo de Página de Gerenciamento de Bots para o Painel Admin
// Caminho sugerido: admin-panel/src/pages/Bots.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Send as SendIcon,
  WhatsApp as WhatsAppIcon,
  Telegram as TelegramIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { api } from '../services/api';

export default function BotsPage() {
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [alert, setAlert] = useState(null);

  const [formData, setFormData] = useState({
    platform: 'telegram',
    identifier: '',
    name: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadChannels(),
        loadLogs(),
        loadStats(),
        loadStatus()
      ]);
    } catch (error) {
      showAlert('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    const response = await api.get('/bots/channels');
    setChannels(response.data.data);
  };

  const loadLogs = async () => {
    const response = await api.get('/bots/logs?limit=50');
    setLogs(response.data.data.logs);
  };

  const loadStats = async () => {
    const response = await api.get('/bots/stats');
    setStats(response.data.data);
  };

  const loadStatus = async () => {
    const response = await api.get('/bots/status');
    setStatus(response.data.data);
  };

  const handleOpenDialog = (channel = null) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        platform: channel.platform,
        identifier: channel.identifier,
        name: channel.name,
        is_active: channel.is_active
      });
    } else {
      setEditingChannel(null);
      setFormData({
        platform: 'telegram',
        identifier: '',
        name: '',
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingChannel(null);
  };

  const handleSaveChannel = async () => {
    try {
      if (editingChannel) {
        await api.put(`/bots/channels/${editingChannel.id}`, formData);
        showAlert('success', 'Canal atualizado com sucesso');
      } else {
        await api.post('/bots/channels', formData);
        showAlert('success', 'Canal criado com sucesso');
      }
      handleCloseDialog();
      loadChannels();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Erro ao salvar canal');
    }
  };

  const handleDeleteChannel = async (id) => {
    if (!window.confirm('Deseja realmente deletar este canal?')) return;
    
    try {
      await api.delete(`/bots/channels/${id}`);
      showAlert('success', 'Canal deletado com sucesso');
      loadChannels();
    } catch (error) {
      showAlert('error', 'Erro ao deletar canal');
    }
  };

  const handleToggleChannel = async (id, isActive) => {
    try {
      await api.patch(`/bots/channels/${id}/toggle`, { is_active: !isActive });
      showAlert('success', `Canal ${!isActive ? 'ativado' : 'desativado'} com sucesso`);
      loadChannels();
    } catch (error) {
      showAlert('error', 'Erro ao alterar status do canal');
    }
  };

  const handleSendTest = async (channelId = null) => {
    try {
      const payload = channelId ? { channelId } : {};
      await api.post('/bots/test', payload);
      showAlert('success', 'Mensagem de teste enviada!');
      setTimeout(loadLogs, 2000);
    } catch (error) {
      showAlert('error', 'Erro ao enviar teste');
    }
  };

  const showAlert = (severity, message) => {
    setAlert({ severity, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const getPlatformIcon = (platform) => {
    return platform === 'whatsapp' ? <WhatsAppIcon /> : <TelegramIcon />;
  };

  const getStatusChip = (status) => {
    const colors = {
      sent: 'success',
      failed: 'error',
      pending: 'warning'
    };
    return <Chip label={status} color={colors[status]} size="small" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">🤖 Gerenciamento de Bots</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            sx={{ mr: 1 }}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Adicionar Canal
          </Button>
        </Box>
      </Box>

      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Status dos Bots */}
      {status && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <WhatsAppIcon sx={{ mr: 1, fontSize: 40, color: '#25D366' }} />
                  <Typography variant="h6">WhatsApp</Typography>
                </Box>
                <Typography>
                  Status: {status.whatsapp.configured ? 
                    <Chip label="Configurado" color="success" size="small" /> : 
                    <Chip label="Não Configurado" color="error" size="small" />
                  }
                </Typography>
                <Typography>Canais Ativos: {status.whatsapp.channels}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TelegramIcon sx={{ mr: 1, fontSize: 40, color: '#0088cc' }} />
                  <Typography variant="h6">Telegram</Typography>
                </Box>
                <Typography>
                  Status: {status.telegram.configured ? 
                    <Chip label="Configurado" color="success" size="small" /> : 
                    <Chip label="Não Configurado" color="error" size="small" />
                  }
                </Typography>
                <Typography>Canais Ativos: {status.telegram.channels}</Typography>
                {status.telegram.bot_info && (
                  <Typography variant="caption">
                    Bot: @{status.telegram.bot_info.username}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Estatísticas */}
      {stats && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="📊 Estatísticas de Envio" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Typography variant="h4">{stats.total}</Typography>
                <Typography color="textSecondary">Total</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="success.main">{stats.sent}</Typography>
                <Typography color="textSecondary">Enviadas</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="error.main">{stats.failed}</Typography>
                <Typography color="textSecondary">Falhas</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="h4" color="warning.main">{stats.pending}</Typography>
                <Typography color="textSecondary">Pendentes</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Canais" />
          <Tab label="Logs" />
        </Tabs>
      </Paper>

      {/* Tab: Canais */}
      {tabValue === 0 && (
        <Card>
          <CardHeader 
            title="Canais Configurados"
            action={
              <Button
                variant="outlined"
                startIcon={<SendIcon />}
                onClick={() => handleSendTest()}
              >
                Testar Todos
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Plataforma</TableCell>
                    <TableCell>Nome</TableCell>
                    <TableCell>Identificador</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getPlatformIcon(channel.platform)}
                          <Typography ml={1}>{channel.platform}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{channel.name}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {channel.identifier}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={channel.is_active}
                          onChange={() => handleToggleChannel(channel.id, channel.is_active)}
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleSendTest(channel.id)}
                          title="Enviar Teste"
                        >
                          <SendIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(channel)}
                          title="Editar"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteChannel(channel.id)}
                          title="Deletar"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab: Logs */}
      {tabValue === 1 && (
        <Card>
          <CardHeader title="Logs de Notificações" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Evento</TableCell>
                    <TableCell>Plataforma</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Erro</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{log.event_type}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          {getPlatformIcon(log.platform)}
                          <Typography ml={1}>{log.platform}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(log.status)}</TableCell>
                      <TableCell>
                        {log.error_message && (
                          <Typography variant="caption" color="error">
                            {log.error_message}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Dialog: Adicionar/Editar Canal */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingChannel ? 'Editar Canal' : 'Adicionar Canal'}
        </DialogTitle>
        <DialogContent>
          <Box pt={2}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Plataforma</InputLabel>
              <Select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                disabled={!!editingChannel}
              >
                <MenuItem value="telegram">
                  <Box display="flex" alignItems="center">
                    <TelegramIcon sx={{ mr: 1 }} />
                    Telegram
                  </Box>
                </MenuItem>
                <MenuItem value="whatsapp">
                  <Box display="flex" alignItems="center">
                    <WhatsAppIcon sx={{ mr: 1 }} />
                    WhatsApp
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Nome do Canal"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
              helperText="Nome descritivo para identificar o canal"
            />

            <TextField
              fullWidth
              label={formData.platform === 'telegram' ? 'Chat ID' : 'Group ID'}
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              disabled={!!editingChannel}
              sx={{ mb: 2 }}
              helperText={
                formData.platform === 'telegram' 
                  ? 'ID do grupo/canal do Telegram (ex: -1001234567890)'
                  : 'ID do grupo do WhatsApp'
              }
            />

            <FormControl fullWidth>
              <Box display="flex" alignItems="center">
                <Typography>Ativo</Typography>
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </Box>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSaveChannel} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
