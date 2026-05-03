import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HealthResponse {
  status: string;
  components?: {
    [key: string]: {
      status: string;
      details?: { [key: string]: any };
    };
  };
}

export interface MetricsResponse {
  names: string[];
}

export interface MetricDetailResponse {
  name: string;
  description?: string;
  baseUnit?: string;
  measurements: { statistic: string; value: number }[];
  availableTags?: { tag: string; values: string[] }[];
}

export interface InfoResponse {
  app?: {
    name?: string;
    version?: string;
    description?: string;
  };
  build?: {
    artifact?: string;
    name?: string;
    version?: string;
    time?: string;
    group?: string;
  };
  [key: string]: any;
}

export interface LoggersResponse {
  levels: string[];
  loggers: {
    [name: string]: {
      configuredLevel: string | null;
      effectiveLevel: string;
    };
  };
}

export interface ThreadDumpResponse {
  threads: any[];
}

@Injectable({
  providedIn: 'root',
})
export class ActuatorService {
  private readonly baseUrl = 'http://localhost:8080/actuator';

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`, { headers: this.headers });
  }

  getMetrics(): Observable<MetricsResponse> {
    return this.http.get<MetricsResponse>(`${this.baseUrl}/metrics`, { headers: this.headers });
  }

  getMetric(name: string): Observable<MetricDetailResponse> {
    return this.http.get<MetricDetailResponse>(`${this.baseUrl}/metrics/${name}`, { headers: this.headers });
  }

  getInfo(): Observable<InfoResponse> {
    return this.http.get<InfoResponse>(`${this.baseUrl}/info`, { headers: this.headers });
  }

  getLoggers(): Observable<LoggersResponse> {
    return this.http.get<LoggersResponse>(`${this.baseUrl}/loggers`, { headers: this.headers });
  }

  setLoggerLevel(name: string, level: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/loggers/${name}`, {
      configuredLevel: level,
    }, { headers: this.headers });
  }

  getThreadDump(): Observable<ThreadDumpResponse> {
    return this.http.get<ThreadDumpResponse>(`${this.baseUrl}/threaddump`, { headers: this.headers });
  }
}
