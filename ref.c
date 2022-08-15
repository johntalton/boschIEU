#include <time.h>
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/ioctl.h>

#include <linux/i2c-dev.h>


#include "bme680.h"

int g_address = 119;
int g_file;

int8_t user_i2c_read(uint8_t dev_id, uint8_t reg_addr, uint8_t *reg_data, uint16_t len)
{
	int8_t rslt = 0;
	//printf("read\n");
	if(dev_id != g_address) { printf("mismatch address\n"); return -1; }

	for(int i = 0; i < len; i++) {
		char buf[1];
		buf[0] = reg_addr + i;
		write(g_file, buf, 1);
		read(g_file, &reg_data[i], 1);
	}

	return 0;
}

int8_t user_i2c_write(uint8_t dev_id, uint8_t reg_addr, uint8_t *reg_data, uint16_t len)
{
	int8_t rslt = 0;
	printf("write\n");
	if(dev_id != g_address) { printf("mismatch address\n"); return -1; }

        char buf[2];
	buf[0] = reg_addr;
	buf[1] = reg_data[0];
	int ret = write(g_file, buf, 2);
	printf(" --> 0x%x 0x%x\n", buf[0], buf[1]);
	if(ret != 2) { return -2; }

	for(int i = 1; i < len; i += 2) {
		buf[0] = reg_data[i];
		buf[1] = reg_data[i + 1];

		ret = write(g_file, buf, 2);
		printf(" --> 0x%x 0x%x", buf[0], buf[1]);
		if(ret != 2) { printf("\n"); return -3; }
	}
	printf("\n");

	return 0;
}

void user_delay_ms(uint32_t period) {
	printf("sleep %i ms\n", period);
	//sleep(1);
	usleep(period * 1000);

	//struct timespec t;
	//t.tv_sec = 0;
	//t.tv_nsec = period / 1000;
	//nanosleep(&t, NULL);
}

void main() {
	int i2cbus = 1;
	char filename[64];
	int size = sizeof(filename);
	snprintf(filename, size, "/dev/i2c-%d", i2cbus);
	filename[size - 1] = '\0';
	g_file = open(filename, O_RDWR);

	int force = 0;
	if (ioctl(g_file, force ? I2C_SLAVE_FORCE : I2C_SLAVE, g_address) < 0) {
		fprintf(stderr,
			"Error: Could not set address to 0x%02x: %s\n",
			g_address, strerror(errno));
		exit(-errno);
	}



	struct bme680_dev gas_sensor;
	gas_sensor.dev_id = 119;
	gas_sensor.intf = BME680_I2C_INTF;
	gas_sensor.read = user_i2c_read;
	gas_sensor.write = user_i2c_write;
	gas_sensor.delay_ms = user_delay_ms;

	gas_sensor.amb_temp = 25;

	int8_t rslt = bme680_init(&gas_sensor);
	if(rslt != BME680_OK) { printf("init failure\n");  exit(-1); }

	//
	uint8_t set_required_settings;

	gas_sensor.tph_sett.os_hum = BME680_OS_2X;
	gas_sensor.tph_sett.os_pres = BME680_OS_2X;
	gas_sensor.tph_sett.os_temp = BME680_OS_2X;
	gas_sensor.tph_sett.filter = BME680_FILTER_SIZE_7;

	gas_sensor.gas_sett.run_gas = BME680_ENABLE_GAS_MEAS;
	gas_sensor.gas_sett.heatr_temp = 320;
	gas_sensor.gas_sett.heatr_dur = 150;

	gas_sensor.power_mode = BME680_FORCED_MODE;

	set_required_settings = BME680_OST_SEL | BME680_OSP_SEL | BME680_OSH_SEL | BME680_FILTER_SEL
		| BME680_GAS_SENSOR_SEL;
	//
	/*
        printf("\tT1: %i\n", gas_sensor.calib.par_t1);
        printf("\tT2: %i\n", gas_sensor.calib.par_t2);
        printf("\tT3: %i\n", gas_sensor.calib.par_t3);

        printf("\tP1:  %i\n", gas_sensor.calib.par_p1);
        printf("\tP2:  %i\n", gas_sensor.calib.par_p2);
        printf("\tP3:  %i\n", gas_sensor.calib.par_p3);
        printf("\tP4:  %i\n", gas_sensor.calib.par_p4);
        printf("\tP5:  %i\n", gas_sensor.calib.par_p5);
        printf("\tP6:  %i\n", gas_sensor.calib.par_p6);
        printf("\tP7:  %i\n", gas_sensor.calib.par_p7);
        printf("\tP8:  %i\n", gas_sensor.calib.par_p8);
        printf("\tP9:  %i\n", gas_sensor.calib.par_p9);
        printf("\tP10: %i\n", gas_sensor.calib.par_p10);

        printf("\tH1: %i\n", gas_sensor.calib.par_h1);
        printf("\tH2: %i\n", gas_sensor.calib.par_h2);
        printf("\tH3: %i\n", gas_sensor.calib.par_h3);
        printf("\tH4: %i\n", gas_sensor.calib.par_h4);
        printf("\tH5: %i\n", gas_sensor.calib.par_h5);
        printf("\tH6: %i\n", gas_sensor.calib.par_h6);
        printf("\tH7: %i\n", gas_sensor.calib.par_h7);

        printf("\tG1: %i\n", gas_sensor.calib.par_gh1);
        printf("\tG2: %i\n", gas_sensor.calib.par_gh2);
        printf("\tG3: %i\n", gas_sensor.calib.par_gh3);

        printf("\tTfine: %i\n", gas_sensor.calib.t_fine);

        printf("\tres_heat_value: %i\n", gas_sensor.calib.res_heat_val);
        printf("\tres_heat_range: %i\n", gas_sensor.calib.res_heat_range);
        printf("\trange_switching_error: %i\n", gas_sensor.calib.range_sw_err);
	*/


	rslt = bme680_set_sensor_settings(set_required_settings,&gas_sensor);
	if(rslt != BME680_OK) { printf("settings failure\n"); exit(-1); }

	rslt = bme680_set_sensor_mode(&gas_sensor);
	if(rslt != BME680_OK) { printf("mode failure\n"); exit(-1); }

	uint16_t meas_period;
	bme680_get_profile_dur(&meas_period, &gas_sensor);
	user_delay_ms(meas_period);


	struct bme680_field_data data;
	while(1)
	{
		rslt = bme680_get_sensor_data(&data, &gas_sensor);
		if(rslt != BME680_OK) { printf("measurement result not ok\n"); }
                if(rslt == BME680_W_NO_NEW_DATA) { printf("NO New Data\n"); }

#ifndef BME680_FLOAT_POINT_COMPENSATION
		printf("(int) T: %.2f degC, P: %.2f hPa, H %.2f %%rH ", data.temperature / 100.0f,
			data.pressure / 100.0f, data.humidity / 1000.0f );

		// once we get valid gas exit
		if(data.status & BME680_GASM_VALID_MSK) {
			printf(", G: %d ohms\r\n", data.gas_resistance);
			break;
		}
#else
		printf("(float) T: %.2f degC, P: %.2f hPa, H %.2f %%rH ", data.temperature,
			data.pressure / 100.0, data.humidity );

		// once we get valid gas exit
		if(data.status & BME680_GASM_VALID_MSK) {
			printf(", G: %f ohms\r\n", (float)data.gas_resistance);
			break;
		}
#endif


		printf("\r\n");

		sleep(1);
	}
}
