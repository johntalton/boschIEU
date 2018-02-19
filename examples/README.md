# Examples:

## Client

Mqtt client to stream sensor data. Handlers disconnect / reconnect (both mqtt and the sensor bus).  Will respect mode changes (sleep vs normal) set by external source (example via repl).
Also can manage chip power settings (example, puts chip in sleep mode when polling is disabled).


